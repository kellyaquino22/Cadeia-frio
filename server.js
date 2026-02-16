/**
 * =========================================================================
 *  SERVIDOR BACKEND - CADEIA DO FRIO
 *  Sistema de monitoramento em tempo real via MQTT + WebSocket
 *  
 *  Funcionalidades:
 *    - Conecta ao broker MQTT (broker.hivemq.com)
 *    - Processa eventos dos 3 portais (Produção, Câmara Fria, Expedição)
 *    - Implementa FSM (Máquina de Estados Finitos) para rastreamento
 *    - Armazena histórico de leituras em memória
 *    - Serve dashboard web via Express
 *    - Transmite dados em tempo real via WebSocket
 *  
 *  Autor: Cedric - TCC Especialização UFRR
 * =========================================================================
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mqtt = require('mqtt');
const path = require('path');

// ========================= CONFIGURAÇÃO =========================
const PORT = 3000;
const MQTT_BROKER = 'mqtt://broker.hivemq.com:1883';

// ========================= SERVIDOR EXPRESS =========================
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir arquivos estáticos (dashboard)
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========================= ARMAZENAMENTO EM MEMÓRIA =========================
const state = {
  // Dados dos portais em tempo real
  portais: {
    producao: {
      nome: 'Recebimento',
      ultimaLeitura: null,
      status: 'offline',
      totalItens: 0
    },
    camara_fria: {
      nome: 'Estoque',
      ultimaLeitura: null,
      status: 'offline',
      totalItens: 0
    },
    expedicao: {
      nome: 'Expedição',
      ultimaLeitura: null,
      status: 'offline',
      totalItens: 0
    }
  },

  // Lotes rastreados (FSM)
  lotes: {},

  // Histórico de eventos (últimos 100)
  eventos: [],

  // Alertas ativos
  alertas: [],

  // Notificações de leitura (últimas 20)
  notificacoes: []
};

// ========================= FSM - MÁQUINA DE ESTADOS =========================
const ESTADOS_VALIDOS = ['producao', 'camara_fria', 'expedicao', 'concluido'];
const TRANSICOES_VALIDAS = {
  'producao': ['camara_fria'],
  'camara_fria': ['expedicao'],
  'expedicao': ['concluido']
};

/**
 * Processa evento de passagem (leitura NFC)
 */
function processarEvento(portal, dados) {
  const { tag_id, timestamp } = dados;
  
  console.log(`\n🔔 EVENTO: ${tag_id} → ${portal.toUpperCase()}`);
  
  // Nomes dos portais para exibição
  const nomePortal = {
    producao: 'Recebimento',
    camara_fria: 'Estoque',
    expedicao: 'Expedição'
  }[portal] || portal;

  // Inicializa lote se não existir
  if (!state.lotes[tag_id]) {
    state.lotes[tag_id] = {
      id: tag_id,
      estado: 'producao',
      historico: [],
      alertas: [],
      criado: new Date().toISOString()
    };
  }

  const lote = state.lotes[tag_id];

  // Valida transição de estado (FSM)
  if (lote.estado !== portal) {
    const transicaoValida = TRANSICOES_VALIDAS[lote.estado]?.includes(portal);
    
    if (!transicaoValida && lote.estado !== portal) {
      const alerta = {
        tipo: 'transicao_invalida',
        lote: tag_id,
        origem: lote.estado,
        destino: portal,
        timestamp: new Date().toISOString(),
        mensagem: `⚠️ Transição inválida: ${lote.estado} → ${portal}`
      };
      
      state.alertas.push(alerta);
      lote.alertas.push(alerta);
      
      console.log(`   ⚠️ ALERTA: Transição inválida!`);
      broadcast({ tipo: 'alerta', alerta });
    } else {
      // Transição válida
      lote.estado = portal;
      console.log(`   ✓ Estado atualizado: ${portal}`);
    }
  }

  // Registra no histórico do lote
  lote.historico.push({
    portal,
    timestamp: new Date().toISOString()
  });

  // Adiciona ao histórico global de eventos
  const evento = {
    tipo: 'passagem',
    lote: tag_id,
    portal,
    estado: lote.estado,
    timestamp: new Date().toISOString()
  };
  
  state.eventos.unshift(evento);
  if (state.eventos.length > 100) state.eventos.pop();

  // Atualiza dados do portal
  state.portais[portal].ultimaLeitura = new Date().toISOString();
  state.portais[portal].status = 'online';
  
  // Conta total de itens em cada portal
  Object.keys(state.portais).forEach(p => {
    state.portais[p].totalItens = Object.values(state.lotes)
      .filter(lote => lote.estado === p).length;
  });

  // Cria notificação de leitura
  const notificacao = {
    tipo: 'leitura_tag',
    mensagem: `📦 Tag ${tag_id} foi lida no portal ${nomePortal}`,
    lote: tag_id,
    portal: nomePortal,
    timestamp: new Date().toISOString()
  };

  // Adiciona ao histórico de notificações
  state.notificacoes.unshift(notificacao);
  if (state.notificacoes.length > 20) state.notificacoes.pop();

  console.log(`   📍 Localização: ${nomePortal}`);
  console.log(`   📦 Tag registrada: ${tag_id}`);

  // Broadcast para clientes WebSocket
  broadcast({
    tipo: 'evento',
    evento,
    lote: state.lotes[tag_id],
    portais: state.portais,
    notificacao  // Adiciona notificação ao broadcast
  });
}

/**
 * Mantém portais como online (heartbeat)
 */
function processarHeartbeat(portal, dados) {
  // Atualiza status do portal
  state.portais[portal].ultimaLeitura = new Date().toISOString();
  state.portais[portal].status = 'online';
}

// ========================= MQTT CLIENT =========================
const mqttClient = mqtt.connect(MQTT_BROKER, {
  clientId: `server-${Math.random().toString(16).slice(2, 10)}`,
  clean: true
});

mqttClient.on('connect', () => {
  console.log('✓ Conectado ao broker MQTT:', MQTT_BROKER);
  
  // Subscribe em todos os tópicos da cadeia do frio
  mqttClient.subscribe('cadeiafrio/#', (err) => {
    if (err) {
      console.error('✗ Erro ao subscrever:', err);
    } else {
      console.log('✓ Subscrito em: cadeiafrio/#');
    }
  });
});

mqttClient.on('message', (topic, message) => {
  try {
    const dados = JSON.parse(message.toString());
    const parts = topic.split('/');
    const portal = parts[1]; // cadeiafrio/{portal}/{tipo}
    const tipo = parts[2];

    if (tipo === 'evento') {
      processarEvento(portal, dados);
    } else if (tipo === 'heartbeat') {
      processarHeartbeat(portal, dados);
    } else if (tipo === 'status') {
      // Atualiza status do portal
      if (state.portais[portal]) {
        state.portais[portal].status = dados.status || 'online';
        broadcast({ tipo: 'status', portal, status: dados.status });
      }
    }
  } catch (err) {
    console.error('Erro ao processar mensagem MQTT:', err);
  }
});

mqttClient.on('error', (err) => {
  console.error('Erro MQTT:', err);
});

// ========================= WEBSOCKET =========================
wss.on('connection', (ws) => {
  console.log('🔌 Cliente WebSocket conectado');

  // Envia estado inicial
  ws.send(JSON.stringify({
    tipo: 'inicial',
    portais: state.portais,
    lotes: state.lotes,
    eventos: state.eventos.slice(0, 20),
    historico: state.historico,
    alertas: state.alertas.slice(-10),
    notificacoes: state.notificacoes.slice(0, 15)
  }));

  ws.on('close', () => {
    console.log('🔌 Cliente WebSocket desconectado');
  });
});

/**
 * Broadcast para todos os clientes WebSocket conectados
 */
function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ========================= VERIFICAÇÃO DE TIMEOUT =========================
// Marca portais como offline se não houver leitura há 30s
setInterval(() => {
  const agora = Date.now();
  Object.keys(state.portais).forEach(portal => {
    const p = state.portais[portal];
    if (p.ultimaLeitura) {
      const diff = agora - new Date(p.ultimaLeitura).getTime();
      if (diff > 30000 && p.status !== 'offline') {
        p.status = 'offline';
        broadcast({ tipo: 'status', portal, status: 'offline' });
        console.log(`⚠️ Portal ${portal} marcado como offline`);
      }
    }
  });
}, 10000);

// ========================= INÍCIO DO SERVIDOR =========================
server.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     🏭 SERVIDOR CADEIA DO FRIO - INICIADO             ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  Dashboard: http://localhost:${PORT}                    ║`);
  console.log(`║  WebSocket: ws://localhost:${PORT}                      ║`);
  console.log(`║  MQTT Broker: ${MQTT_BROKER}             ║`);
  console.log('╚════════════════════════════════════════════════════════╝\n');
});
