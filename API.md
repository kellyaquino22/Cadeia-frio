# 📡 Documentação da API e Estrutura de Dados

## Estrutura de Mensagens MQTT

### 1. Evento de Passagem (NFC)

**Tópico**: `cadeiafrio/{portal}/evento`

**Payload**:
```json
{
  "tag_id": "LOTE-A1B2C3",
  "portal": "producao",
  "temperatura": 22.50,
  "umidade": 55.2,
  "tipo": "passagem",
  "timestamp": 1234567890
}
```

### 2. Leitura de Sensor (Monitoramento)

**Tópico**: `cadeiafrio/{portal}/sensor`

**Payload**:
```json
{
  "portal": "camara_fria",
  "temperatura": 2.30,
  "umidade": 75.5,
  "tipo": "monitoramento",
  "timestamp": 1234567890
}
```

### 3. Status do Portal

**Tópico**: `cadeiafrio/{portal}/status`

**Payload**:
```json
{
  "status": "online"
}
```

---

## Estrutura de Dados do Servidor

### Estado Global (`state`)

```javascript
{
  // Status dos portais
  portais: {
    producao: {
      nome: "Produção",
      temperatura: 22.5,
      umidade: 55.2,
      ultimaLeitura: "2026-02-14T12:30:00.000Z",
      status: "online"
    },
    camara_fria: { ... },
    expedicao: { ... }
  },

  // Lotes rastreados (FSM)
  lotes: {
    "LOTE-A1B2C3": {
      id: "LOTE-A1B2C3",
      estado: "camara_fria",
      historico: [
        {
          portal: "producao",
          temperatura: 22.5,
          umidade: 55.2,
          timestamp: "2026-02-14T12:00:00.000Z"
        },
        {
          portal: "camara_fria",
          temperatura: 2.3,
          umidade: 75.5,
          timestamp: "2026-02-14T12:05:00.000Z"
        }
      ],
      alertas: [],
      criado: "2026-02-14T12:00:00.000Z"
    }
  },

  // Eventos recentes (últimos 100)
  eventos: [
    {
      tipo: "passagem",
      lote: "LOTE-A1B2C3",
      portal: "camara_fria",
      temperatura: 2.3,
      umidade: 75.5,
      estado: "camara_fria",
      timestamp: "2026-02-14T12:05:00.000Z"
    }
  ],

  // Histórico de sensores (últimos 50 por portal)
  historico: {
    producao: [
      {
        temperatura: 22.5,
        umidade: 55.2,
        timestamp: "2026-02-14T12:00:00.000Z"
      }
    ],
    camara_fria: [ ... ],
    expedicao: [ ... ]
  },

  // Alertas ativos
  alertas: [
    {
      tipo: "temperatura_fora_limite",
      lote: "LOTE-A1B2C3",
      portal: "camara_fria",
      temperatura: 8.5,
      limites: { min: -2, max: 5 },
      timestamp: "2026-02-14T12:10:00.000Z",
      mensagem: "🌡️ Temperatura fora do limite..."
    }
  ]
}
```

---

## Mensagens WebSocket (Cliente ← Servidor)

### 1. Estado Inicial

Enviado quando cliente conecta.

```json
{
  "tipo": "inicial",
  "portais": { ... },
  "lotes": { ... },
  "eventos": [ ... ],
  "historico": { ... },
  "alertas": [ ... ]
}
```

### 2. Novo Evento

```json
{
  "tipo": "evento",
  "evento": {
    "tipo": "passagem",
    "lote": "LOTE-A1B2C3",
    "portal": "camara_fria",
    "temperatura": 2.3,
    "umidade": 75.5,
    "estado": "camara_fria",
    "timestamp": "2026-02-14T12:05:00.000Z"
  },
  "lote": {
    "id": "LOTE-A1B2C3",
    "estado": "camara_fria",
    "historico": [ ... ],
    "alertas": [],
    "criado": "2026-02-14T12:00:00.000Z"
  },
  "portais": { ... }
}
```

### 3. Leitura de Sensor

```json
{
  "tipo": "sensor",
  "portal": "camara_fria",
  "dados": {
    "temperatura": 2.3,
    "umidade": 75.5,
    "timestamp": "2026-02-14T12:05:00.000Z"
  },
  "portais": { ... }
}
```

### 4. Novo Alerta

```json
{
  "tipo": "alerta",
  "alerta": {
    "tipo": "temperatura_fora_limite",
    "lote": "LOTE-A1B2C3",
    "portal": "camara_fria",
    "temperatura": 8.5,
    "limites": { min: -2, max: 5 },
    "timestamp": "2026-02-14T12:10:00.000Z",
    "mensagem": "🌡️ Temperatura fora do limite..."
  }
}
```

### 5. Atualização de Status

```json
{
  "tipo": "status",
  "portal": "producao",
  "status": "offline"
}
```

---

## FSM - Máquina de Estados Finitos

### Estados Válidos

```javascript
const ESTADOS_VALIDOS = [
  'producao',
  'camara_fria', 
  'expedicao',
  'concluido'
];
```

### Transições Válidas

```javascript
const TRANSICOES_VALIDAS = {
  'producao': ['camara_fria'],
  'camara_fria': ['expedicao'],
  'expedicao': ['concluido']
};
```

### Diagrama de Estados

```
     ┌──────────────┐
     │  PRODUÇÃO    │
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │ CÂMARA FRIA  │
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │  EXPEDIÇÃO   │
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │  CONCLUÍDO   │
     └──────────────┘
```

### Validação de Transições

```javascript
function validarTransicao(estadoAtual, novoEstado) {
  // Se está no mesmo estado, permite
  if (estadoAtual === novoEstado) return true;
  
  // Verifica se transição é válida
  const transicoesPermitidas = TRANSICOES_VALIDAS[estadoAtual];
  return transicoesPermitidas?.includes(novoEstado) || false;
}
```

---

## Limites de Temperatura

```javascript
const LIMITES_TEMP = {
  producao: {
    min: 15,    // °C
    max: 25     // °C
  },
  camara_fria: {
    min: -2,    // °C
    max: 5      // °C
  },
  expedicao: {
    min: 0,     // °C
    max: 10     // °C
  }
};
```

---

## Tipos de Alertas

### 1. Temperatura Fora do Limite

**Condição**: `temperatura < min || temperatura > max`

```json
{
  "tipo": "temperatura_fora_limite",
  "lote": "LOTE-A1B2C3",
  "portal": "camara_fria",
  "temperatura": 8.5,
  "limites": { "min": -2, "max": 5 },
  "timestamp": "2026-02-14T12:10:00.000Z",
  "mensagem": "🌡️ Temperatura fora do limite em camara_fria: 8.5°C (esperado: -2-5°C)"
}
```

### 2. Transição Inválida

**Condição**: Lote pula etapas ou volta no fluxo

```json
{
  "tipo": "transicao_invalida",
  "lote": "LOTE-A1B2C3",
  "origem": "producao",
  "destino": "expedicao",
  "timestamp": "2026-02-14T12:10:00.000Z",
  "mensagem": "⚠️ Transição inválida: producao → expedicao"
}
```

---

## Endpoints HTTP (Express)

### GET /

Retorna o dashboard HTML.

**Response**: `index.html`

---

## WebSocket Connection

### Conectar

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('Conectado!');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Mensagem recebida:', data);
};
```

### Mensagens Recebidas

O servidor envia mensagens automaticamente quando:
- Cliente conecta → tipo: `"inicial"`
- Evento de passagem → tipo: `"evento"`
- Leitura de sensor → tipo: `"sensor"`
- Novo alerta → tipo: `"alerta"`
- Status muda → tipo: `"status"`

---

## Configurações

### Intervalo de Publicação (ESP32)

```cpp
const unsigned long SENSOR_INTERVAL = 5000; // 5 segundos
```

### Timeout de Portal Offline (Servidor)

```javascript
// Marca portal como offline após 30s sem leitura
setInterval(() => {
  // Verifica cada portal...
}, 10000); // Verifica a cada 10s
```

### Histórico Mantido em Memória

- **Eventos**: 100 últimos
- **Leituras de sensor**: 50 últimas por portal
- **Alertas**: 20 últimos
- **Lotes**: Ilimitado (enquanto servidor estiver rodando)

---

## Performance e Escalabilidade

### Capacidade Atual

- **Portais simultâneos**: 3 (configurado)
- **Lotes simultâneos**: Ilimitado
- **Clientes WebSocket**: Ilimitado
- **Latência típica**: < 100ms

### Melhorias Futuras

Para produção, considerar:

1. **Banco de Dados**
   - PostgreSQL para dados relacionais
   - MongoDB para histórico de eventos
   - Redis para cache

2. **Autenticação**
   - JWT para API
   - OAuth2 para dashboard

3. **Escalabilidade**
   - Load balancer
   - Cluster de servidores Node.js
   - MQTT broker privado (Mosquitto)

4. **Monitoring**
   - Prometheus + Grafana
   - Logs estruturados (Winston)
   - Health checks

---

## Exemplos de Uso da API

### Verificar Status dos Portais (via estado interno)

```javascript
// No servidor (server.js)
console.log(state.portais);
// {
//   producao: { temperatura: 22.5, ... },
//   ...
// }
```

### Obter Histórico de um Lote

```javascript
// No servidor (server.js)
const lote = state.lotes['LOTE-A1B2C3'];
console.log(lote.historico);
// [
//   { portal: 'producao', temperatura: 22.5, ... },
//   { portal: 'camara_fria', temperatura: 2.3, ... }
// ]
```

### Verificar Alertas Ativos

```javascript
// No servidor (server.js)
console.log(state.alertas);
// [
//   { tipo: 'temperatura_fora_limite', ... }
// ]
```

---

## 🔒 Segurança

### Recomendações para Produção

1. **MQTT**
   - Use TLS (mqtts://)
   - Autenticação com usuário/senha
   - ACL para restringir tópicos

2. **WebSocket**
   - Use WSS (WebSocket Secure)
   - Token de autenticação
   - Rate limiting

3. **HTTP**
   - HTTPS obrigatório
   - CORS configurado
   - Headers de segurança (Helmet.js)

4. **Validação**
   - Validar todos os payloads MQTT
   - Sanitizar dados antes de armazenar
   - Rate limiting de eventos

---

✨ **Documentação atualizada em**: Fevereiro 2026
