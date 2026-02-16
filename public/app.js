/**
 * =========================================================================
 *  DASHBOARD CLIENT - CONTROLE DE ESTOQUE
 *  JavaScript para conexão WebSocket e atualização em tempo real
 *  Foco: Rastreamento por NFC e FSM (sem sensores de temperatura)
 * =========================================================================
 */

// ========================= CONEXÃO WEBSOCKET =========================
let ws;
let reconnectTimeout;
const WS_URL = `ws://${window.location.host}`;

function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('✓ Conectado ao servidor WebSocket');
    updateConnectionStatus(true);
    clearTimeout(reconnectTimeout);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleMessage(data);
    } catch (err) {
      console.error('Erro ao processar mensagem:', err);
    }
  };

  ws.onerror = (error) => {
    console.error('Erro WebSocket:', error);
  };

  ws.onclose = () => {
    console.log('✗ Desconectado do servidor WebSocket');
    updateConnectionStatus(false);
    
    // Reconectar após 3 segundos
    reconnectTimeout = setTimeout(connectWebSocket, 3000);
  };
}

// ========================= ESTADO GLOBAL =========================
let state = {
  portais: {},
  eventos: [],
  alertas: [],
  notificacoes: [],
  lotes: {}
};

// ========================= HANDLERS DE MENSAGENS =========================
function handleMessage(data) {
  console.log('Mensagem recebida:', data.tipo);

  switch (data.tipo) {
    case 'inicial':
      // Estado inicial do servidor
      state.portais = data.portais;
      state.eventos = data.eventos || [];
      state.alertas = data.alertas || [];
      state.notificacoes = data.notificacoes || [];
      state.lotes = data.lotes || {};
      renderPortais();
      renderEventos();
      renderAlertas();
      renderNotificacoes();
      renderEstatisticas();
      break;

    case 'evento':
      // Novo evento de passagem
      state.portais = data.portais;
      state.eventos.unshift(data.evento);
      if (state.eventos.length > 50) state.eventos.pop();
      
      // Atualiza lote
      if (data.lote) {
        state.lotes[data.lote.id] = data.lote;
      }
      
      // Adiciona notificação se presente
      if (data.notificacao) {
        state.notificacoes.unshift(data.notificacao);
        if (state.notificacoes.length > 20) state.notificacoes.pop();
        renderNotificacoes();
      }
      
      renderPortais();
      renderEventos();
      renderEstatisticas();
      playNotificationSound();
      break;

    case 'alerta':
      // Novo alerta
      state.alertas.unshift(data.alerta);
      if (state.alertas.length > 20) state.alertas.pop();
      renderAlertas();
      playAlertSound();
      break;

    case 'status':
      // Atualização de status de portal
      if (state.portais[data.portal]) {
        state.portais[data.portal].status = data.status;
        renderPortais();
      }
      break;
  }
}

// ========================= RENDERIZAÇÃO =========================
function renderPortais() {
  const grid = document.getElementById('portaisGrid');
  const portais = [
    { id: 'producao', nome: 'Recebimento', icon: '📥' },
    { id: 'camara_fria', nome: 'Estoque', icon: '📦' },
    { id: 'expedicao', nome: 'Expedição', icon: '🚚' }
  ];

  grid.innerHTML = portais.map(portal => {
    const dados = state.portais[portal.id] || {};
    const status = dados.status || 'offline';
    const totalItens = dados.totalItens || 0;
    const ultimaLeitura = dados.ultimaLeitura 
      ? formatarTempo(new Date(dados.ultimaLeitura))
      : 'Nunca';

    return `
      <div class="portal-card ${portal.id}">
        <div class="portal-header">
          <div class="portal-name">${portal.icon} ${portal.nome}</div>
          <div class="portal-status ${status}">${status}</div>
        </div>
        <div class="portal-metrics">
          <div class="metric">
            <div class="metric-label">📦 Itens no Local</div>
            <div class="metric-value">
              ${totalItens}<span class="metric-unit">itens</span>
            </div>
            <div class="metric-updated">${ultimaLeitura}</div>
          </div>
          <div class="metric">
            <div class="metric-label">🕐 Última Leitura</div>
            <div class="metric-value" style="font-size: 1.2rem;">
              ${ultimaLeitura}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderEventos() {
  const lista = document.getElementById('eventosList');
  
  if (state.eventos.length === 0) {
    lista.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <div>Aguardando eventos...</div>
      </div>
    `;
    return;
  }

  lista.innerHTML = state.eventos.slice(0, 20).map(evento => {
    const portais = {
      producao: '📥 Recebimento',
      camara_fria: '📦 Estoque',
      expedicao: '🚚 Expedição'
    };

    return `
      <div class="evento-item">
        <div class="evento-header">
          <div class="evento-lote">📦 ${evento.lote}</div>
          <div class="evento-portal">${portais[evento.portal]}</div>
        </div>
        <div class="evento-dados">
          <span>📍 ${portais[evento.portal]}</span>
          <span>🏷️ Estado: ${evento.estado}</span>
        </div>
        <div class="evento-timestamp">${formatarDataHora(new Date(evento.timestamp))}</div>
      </div>
    `;
  }).join('');
}

function renderAlertas() {
  const lista = document.getElementById('alertasList');
  
  if (state.alertas.length === 0) {
    lista.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✓</div>
        <div>Nenhum alerta ativo</div>
      </div>
    `;
    return;
  }

  lista.innerHTML = state.alertas.slice(0, 10).map(alerta => {
    const critico = alerta.tipo === 'transicao_invalida';
    
    return `
      <div class="alerta-item ${critico ? 'critico' : ''}">
        <div class="alerta-mensagem">${alerta.mensagem}</div>
        <div class="alerta-detalhes">
          <span>Item: ${alerta.lote}</span>
          <span>${formatarDataHora(new Date(alerta.timestamp))}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderNotificacoes() {
  const lista = document.getElementById('notificacoesList');
  
  if (state.notificacoes.length === 0) {
    lista.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <div>Nenhuma leitura ainda</div>
      </div>
    `;
    return;
  }

  lista.innerHTML = state.notificacoes.slice(0, 15).map(notif => {
    const iconePortal = {
      'Recebimento': '📥',
      'Estoque': '📦',
      'Expedição': '🚚'
    }[notif.portal] || '📍';

    return `
      <div class="notificacao-item">
        <div class="notificacao-header">
          <div class="notificacao-titulo">${iconePortal} ${notif.portal}</div>
          <div class="notificacao-badge">LIDO</div>
        </div>
        <div class="notificacao-conteudo">
          <div class="notificacao-dado">
            <strong>Item:</strong> ${notif.lote}
          </div>
          <div class="notificacao-dado">
            <strong>Local:</strong> ${notif.portal}
          </div>
        </div>
        <div class="notificacao-timestamp">${formatarDataHora(new Date(notif.timestamp))}</div>
      </div>
    `;
  }).join('');
}

function renderEstatisticas() {
  const container = document.getElementById('estatisticasContainer');
  
  // Calcula estatísticas
  const totalLotes = Object.keys(state.lotes).length;
  const lotesRecebimento = Object.values(state.lotes).filter(l => l.estado === 'producao').length;
  const lotesEstoque = Object.values(state.lotes).filter(l => l.estado === 'camara_fria').length;
  const lotesExpedicao = Object.values(state.lotes).filter(l => l.estado === 'expedicao').length;
  const lotesConcluidos = Object.values(state.lotes).filter(l => l.estado === 'concluido').length;
  const totalEventos = state.eventos.length;
  const totalAlertas = state.alertas.length;

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;">
      <div class="metric" style="background: var(--bg-elevated); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color);">
        <div class="metric-label">📦 Total de Itens Rastreados</div>
        <div class="metric-value" style="font-size: 3rem;">${totalLotes}</div>
      </div>
      
      <div class="metric" style="background: var(--bg-elevated); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color);">
        <div class="metric-label">📋 Total de Movimentações</div>
        <div class="metric-value" style="font-size: 3rem;">${totalEventos}</div>
      </div>
      
      <div class="metric" style="background: var(--bg-elevated); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color);">
        <div class="metric-label">📥 Em Recebimento</div>
        <div class="metric-value" style="font-size: 2.5rem; color: var(--accent-cyan);">${lotesRecebimento}</div>
      </div>
      
      <div class="metric" style="background: var(--bg-elevated); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color);">
        <div class="metric-label">📦 Em Estoque</div>
        <div class="metric-value" style="font-size: 2.5rem; color: var(--accent-blue);">${lotesEstoque}</div>
      </div>
      
      <div class="metric" style="background: var(--bg-elevated); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color);">
        <div class="metric-label">🚚 Em Expedição</div>
        <div class="metric-value" style="font-size: 2.5rem; color: var(--accent-purple);">${lotesExpedicao}</div>
      </div>
      
      <div class="metric" style="background: var(--bg-elevated); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color);">
        <div class="metric-label">✅ Concluídos</div>
        <div class="metric-value" style="font-size: 2.5rem; color: var(--accent-green);">${lotesConcluidos}</div>
      </div>
    </div>
    
    ${totalAlertas > 0 ? `
      <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(255, 107, 53, 0.1); border-left: 4px solid var(--accent-orange); border-radius: 8px;">
        <strong>⚠️ ${totalAlertas} alerta(s) ativo(s)</strong> - Verifique a seção de alertas abaixo
      </div>
    ` : ''}
  `;
}

// ========================= UTILIDADES =========================
function updateConnectionStatus(connected) {
  const dot = document.getElementById('connectionDot');
  const text = document.getElementById('connectionText');
  
  if (connected) {
    dot.classList.remove('offline');
    text.textContent = 'Online';
  } else {
    dot.classList.add('offline');
    text.textContent = 'Offline';
  }
}

function formatarTempo(data) {
  const agora = new Date();
  const diff = Math.floor((agora - data) / 1000); // diferença em segundos

  if (diff < 10) return 'Agora';
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

function formatarDataHora(data) {
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// ========================= NOTIFICAÇÕES SONORAS =========================
function playNotificationSound() {
  // Beep curto para eventos normais
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
}

function playAlertSound() {
  // Beep mais longo e grave para alertas
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 400;
  oscillator.type = 'square';
  
  gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
}

// ========================= INICIALIZAÇÃO =========================
window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Inicializando Dashboard de Controle de Estoque...');
  
  connectWebSocket();
  
  // Atualiza tempos relativos a cada 10s
  setInterval(() => {
    renderPortais();
  }, 10000);
  
  // Atualiza estatísticas a cada 5s
  setInterval(() => {
    if (Object.keys(state.lotes).length > 0) {
      renderEstatisticas();
    }
  }, 5000);
});
