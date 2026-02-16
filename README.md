#  Sistema de Controle de Estoque com NFC e FSM

Sistema completo de rastreamento e controle de estoque em tempo real usando tecnologia NFC e Máquinas de Estados Finitos (FSM), desenvolvido como protótipo para TCC da Especialização UFRR.

##  Visão Geral

O sistema rastreia itens através de 3 pontos de controle (Recebimento, Estoque e Expedição) usando:
- **Hardware**: ESP32 + Simulação de leitor NFC (PN532)
- **Comunicação**: MQTT via broker público
- **Backend**: Node.js com processamento FSM em tempo real
- **Frontend**: Dashboard moderno com estatísticas ao vivo

##  Arquitetura do Sistema

```
┌─────────────────┐
│  ESP32 Portal   │  (Wokwi Simulator)
│  Recebimento    │  → MQTT (broker.hivemq.com)
└─────────────────┘            ↓
                    ┌──────────────────────┐
┌─────────────────┐│   Node.js Backend    │
│  ESP32 Portal   ││  - Processa MQTT     │
│  Estoque        │→  - FSM (Estados)     │
└─────────────────┘│  - WebSocket Server  │
                    └──────────────────────┘
┌─────────────────┐            ↓
│  ESP32 Portal   │  ┌──────────────────────┐
│  Expedição      │  │  Dashboard Web       │
└─────────────────┘  │  - Tempo Real        │
                     │  - Estatísticas      │
                     │  - Alertas FSM       │
                     └──────────────────────┘
```

##  Instalação e Execução

### 1. Pré-requisitos

- Node.js (v16 ou superior)
- npm ou yarn
- Navegador moderno (Chrome, Firefox, Edge)

### 2. Instalar Dependências

```bash
npm install
```

### 3. Iniciar o Servidor

```bash
npm start
```

O servidor estará disponível em: **http://localhost:3000**

### 4. Configurar Simulação Wokwi

1. Acesse o Wokwi: https://wokwi.com
2. Crie um novo projeto ESP32
3. Cole o código do arquivo `wokwi_portal.ino`
4. Adicione o arquivo `libraries.txt`
5. Adicione o arquivo `diagram.json`
6. Configure o `PORTAL_ID` (linha 20):
   - `#define PORTAL_ID 1` → Recebimento
   - `#define PORTAL_ID 2` → Estoque
   - `#define PORTAL_ID 3` → Expedição
7. Abra 3 abas (uma para cada portal)
8. Inicie as simulações

##  Fluxo de Estados (FSM)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Recebimento  │ ──→ │   Estoque    │ ──→ │  Expedição   │ ──→ │  Concluído   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
   
```

**Transições Válidas:**
- Recebimento → Estoque
- Estoque → Expedição
- Expedição → Concluído

**Alertas:**
-  Transição inválida (ex: pular etapas)

##  Funcionalidades

### Backend
- ✅ Processamento MQTT em tempo real
- ✅ FSM para validação de fluxo
- ✅ Sistema de alertas
- ✅ Contagem de itens por localização
- ✅ WebSocket para dashboard
- ✅ Histórico de movimentações

### Dashboard
- ✅ Visualização em tempo real
- ✅ Estatísticas completas
- ✅ Notificações de leitura
- ✅ Alertas visuais e sonoros
- ✅ Design responsivo

##  Estrutura do Projeto

```
sistema-estoque/
├── server.js              # Backend Node.js
├── package.json           # Dependências
├── wokwi_portal.ino       # Código ESP32
├── libraries.txt          # Bibliotecas Wokwi
├── diagram.json           # Hardware Wokwi
├── public/
│   ├── index.html         # Dashboard
│   └── app.js             # Frontend JS
└── README.md              # Documentação
```

##  Troubleshooting

### Dashboard não conecta
- Verifique se o servidor está rodando
- Force atualização: `Ctrl + Shift + R`
- Limpe o cache do navegador

### Wokwi não envia dados
- Aguarde 10-15 segundos após iniciar
- Verifique o Serial Monitor
- Confirme conexão MQTT

##  Tecnologias

- **Backend**: Node.js, Express, MQTT.js, WebSocket
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **IoT**: ESP32, NFC, MQTT
- **Simulação**: Wokwi

##  Conceitos Demonstrados

- ✅ Máquinas de Estados Finitos (FSM)
- ✅ Algoritmos de proximidade NFC
- ✅ Rastreamento em tempo real
- ✅ Arquitetura IoT completa
- ✅ Validação de fluxo

##  Licença

MIT License - TCC Especialização UFRR

## Autora

**Kelly** - UFRR - Fevereiro 2026
