# 🚀 Quick Start - Cadeia do Frio

## ⚡ Início Rápido (5 minutos)

### Passo 1: Instalar e Iniciar Servidor (2 min)

```bash
# Instalar dependências
npm install

# Iniciar servidor
npm start
```

✅ Servidor rodando em: http://localhost:3000

### Passo 2: Configurar Simulação Wokwi (2 min)

1. Acesse: https://wokwi.com/projects/new/esp32
2. Clique em "sketch.ino" e cole o conteúdo de `wokwi_portal.ino`
3. Clique no ícone "+" ao lado de "sketch.ino"
4. Selecione "diagram.json" e cole o conteúdo de `diagram.json`
5. Altere a linha 20 do código:
   ```cpp
   #define PORTAL_ID 1  // 1=Produção, 2=Câmara Fria, 3=Expedição
   ```

### Passo 3: Executar (1 min)

1. **Abra 3 abas do navegador**
2. Em cada aba, configure um portal diferente (PORTAL_ID = 1, 2 ou 3)
3. Clique em "Start Simulation" nas 3 abas
4. Abra o dashboard: http://localhost:3000
5. **Pressione os botões azuis** no Wokwi para simular leituras NFC

## 📊 O que você verá

### No Dashboard:
- ✅ 3 cards com temperatura e umidade de cada portal
- ✅ Gráfico de temperatura em tempo real
- ✅ Lista de eventos (passagens de lotes)
- ✅ Alertas quando temperatura sair dos limites

### No Wokwi (Serial Monitor):
```
╔══════════════════════════════════════════╗
║  📦 LEITURA NFC - Portal Produção
╠══════════════════════════════════════════╣
║  Tag:  LOTE-A1B2C3
║  Temp: 22.50 °C
║  Umid: 55.2 %
║  Tópico: cadeiafrio/producao/evento
╚══════════════════════════════════════════╝
```

## 🎯 Fluxo de Teste Recomendado

1. **Inicie Produção** (Portal 1)
   - Pressione botão → Lote passa pela produção

2. **Aguarde 5 segundos**

3. **Passe pela Câmara Fria** (Portal 2)
   - Pressione botão → Lote entra na câmara fria
   - ✅ Transição válida!

4. **Passe pela Expedição** (Portal 3)
   - Pressione botão → Lote vai para expedição
   - ✅ Transição válida!

5. **Teste um erro** (volte ao Portal 1)
   - Pressione botão no Portal 1 novamente
   - ⚠️ Alerta de transição inválida!

## 🌡️ Limites de Temperatura

| Portal | Temperatura Esperada |
|--------|---------------------|
| 🏭 Produção | 15-25°C |
| ❄️ Câmara Fria | -2 a 5°C |
| 🚚 Expedição | 0-10°C |

> **Dica**: Para simular temperatura fora do limite, você pode modificar o valor no código Wokwi temporariamente ou aguardar a variação natural do sensor simulado.

## 🔍 Monitoramento em Tempo Real

O sistema atualiza automaticamente:
- **Sensores**: A cada 5 segundos
- **Dashboard**: Instantâneo via WebSocket
- **Gráfico**: Atualiza a cada 2 segundos

## 🎵 Feedback Sonoro

- **Bip curto**: Evento de passagem registrado
- **Bip longo**: Alerta de temperatura ou transição inválida

## 💡 Dicas

1. **Abra o Serial Monitor** no Wokwi para ver logs detalhados
2. **Abra o Console do navegador** (F12) para ver mensagens WebSocket
3. **Use múltiplas janelas** para visualizar tudo ao mesmo tempo:
   - Wokwi (3 abas)
   - Dashboard
   - HiveMQ WebSocket Client (opcional)

## 🐛 Problemas Comuns

### Dashboard não conecta
```bash
# Verifique se o servidor está rodando
# Procure por esta mensagem no terminal:
╔════════════════════════════════════════════════════════╗
║     🏭 SERVIDOR CADEIA DO FRIO - INICIADO             ║
╚════════════════════════════════════════════════════════╝
```

### Wokwi não conecta ao MQTT
```
# No Serial Monitor, você deve ver:
[WiFi] Conectado! IP: 192.168.1.10
[MQTT] Conectando ao broker... conectado!
```

Se não aparecer, aguarde 10 segundos e pressione "Restart" no Wokwi.

## 📱 Testar no HiveMQ (Opcional)

Para ver mensagens MQTT em tempo real:

1. Acesse: https://www.hivemq.com/demos/websocket-client/
2. Clique em "Connect"
3. Em "Subscriptions", adicione: `cadeiafrio/#`
4. Clique em "Subscribe"
5. Pressione botões no Wokwi e veja as mensagens chegando!

## 🎓 Para o TCC

Este sistema demonstra:
- ✅ Arquitetura IoT completa
- ✅ Comunicação MQTT
- ✅ Processamento em tempo real
- ✅ FSM (Máquina de Estados)
- ✅ Dashboard responsivo
- ✅ Sistema de alertas
- ✅ Rastreamento de lotes

**Próximos passos sugeridos**:
- Adicionar banco de dados (MongoDB/PostgreSQL)
- Implementar autenticação
- Criar relatórios (PDFs)
- Adicionar notificações push
- Implementar histórico de lotes
- Dashboard mobile (React Native)

---

✨ **Boa sorte com seu TCC!** ✨
