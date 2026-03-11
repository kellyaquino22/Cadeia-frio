/*
 * =========================================================================
 *  CONTROLE DE ESTOQUE - RASTREAMENTO POR NFC E FSM
 *  Simulação Wokwi: 3 Pontos de Controle (Recebimento, Estoque, Expedição)
 *  
 *  Hardware simulado por ponto:
 *    - ESP32 DevKit v1
 *    - Botão (simula leitura NFC do PN532)
 *    - LED (indica leitura NFC ativa)
 *  
 *  Comunicação: MQTT via broker público (broker.hivemq.com)
 *  Payload: JSON com tag_id, localização, portal e timestamp
 *  
 *  FSM (Máquina de Estados Finitos):
 *    Recebimento → Estoque → Expedição → Concluído
 *  
 *  Para visualizar mensagens:
 *    1. Acesse https://www.hivemq.com/demos/websocket-client/
 *    2. Clique em "Connect"
 *    3. Subscribe no tópico: cadeiafrio/#
 *    4. Inicie a simulação e pressione os botões para simular leituras NFC
 *  
 *  Autor: KELLY - TCC Especialização UFRR
 * =========================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ========================= CONFIGURAÇÃO =========================
// Altere PORTAL_ID para simular portais diferentes em abas separadas:
//   1 = Produção, 2 = Câmara Fria, 3 = Expedição
#define PORTAL_ID 1

// ========================= DEFINIÇÃO DE PORTAIS =========================
#if PORTAL_ID == 1
  #define PORTAL_NOME   "producao"
  #define PORTAL_LABEL  "Portal Produção"
  #define CLIENT_ID     "esp32-portal-producao"
#elif PORTAL_ID == 2
  #define PORTAL_NOME   "camara_fria"
  #define PORTAL_LABEL  "Portal Câmara Fria"
  #define CLIENT_ID     "esp32-portal-camara-fria"
#elif PORTAL_ID == 3
  #define PORTAL_NOME   "expedicao"
  #define PORTAL_LABEL  "Portal Expedição"
  #define CLIENT_ID     "esp32-portal-expedicao"
#endif

// ========================= PINOS =========================
#define NFC_BTN_PIN  4    // Botão simula leitura NFC
#define LED_PIN      2    // LED indica leitura NFC

// ========================= WIFI & MQTT =========================
const char* ssid          = "Wokwi-GUEST";
const char* password      = "";
const char* mqtt_server   = "broker.hivemq.com";
const int   mqtt_port     = 1883;

// Tópicos MQTT
// cadeiafrio/{portal}/evento  → evento de passagem (NFC + localização)
char topic_evento[50];

// ========================= OBJETOS GLOBAIS =========================
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ========================= VARIÁVEIS =========================
// Simula IDs de tags NFC (como se fossem produtos/itens de estoque)
const char* nfc_tags[] = {
  "ITEM-A1B2C3",
  "ITEM-D4E5F6",
  "ITEM-G7H8I9",
  "ITEM-J0K1L2"
};
int tagIndex = 0;
bool lastButtonState = HIGH;
unsigned long lastDebounce = 0;
const unsigned long DEBOUNCE_DELAY = 250;

// ========================= FUNÇÕES =========================

void setup_wifi() {
  Serial.println();
  Serial.print("[WiFi] Conectando a ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("[WiFi] Conectado! IP: ");
  Serial.println(WiFi.localIP());
}

void mqtt_reconnect() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Conectando ao broker...");
    
    if (mqttClient.connect(CLIENT_ID)) {
      Serial.println(" conectado!");
      
      // Publica mensagem de status online
      char topic_status[50];
      snprintf(topic_status, sizeof(topic_status), "cadeiafrio/%s/status", PORTAL_NOME);
      mqttClient.publish(topic_status, "{\"status\":\"online\"}", true);
    } else {
      Serial.print(" falhou, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" tentando novamente em 3s...");
      delay(3000);
    }
  }
}

/**
 * Publica evento de passagem (leitura NFC + localização)
 * Este é o evento principal que alimenta a FSM no servidor
 */
void publishEvento(const char* tagId) {
  // Monta JSON do evento
  StaticJsonDocument<256> doc;
  doc["tag_id"]      = tagId;
  doc["portal"]      = PORTAL_NOME;
  doc["tipo"]         = "passagem";
  doc["timestamp"]    = millis();

  char payload[256];
  serializeJson(doc, payload, sizeof(payload));

  mqttClient.publish(topic_evento, payload);

  // Log no Serial
  Serial.println();
  Serial.println("╔══════════════════════════════════════════╗");
  Serial.print("║  📦 LEITURA NFC - ");
  Serial.println(PORTAL_LABEL);
  Serial.println("╠══════════════════════════════════════════╣");
  Serial.print("║  Item:  ");
  Serial.println(tagId);
  Serial.print("║  Local: ");
  Serial.println(PORTAL_LABEL);
  Serial.print("║  Tópico: ");
  Serial.println(topic_evento);
  Serial.println("╚══════════════════════════════════════════╝");
  Serial.print("║  Payload: ");
  Serial.println(payload);
}

/**
 * Verifica botão com debounce (simula aproximação de tag NFC)
 */
void checkNfcButton() {
  bool currentState = digitalRead(NFC_BTN_PIN);
  
  if (currentState == LOW && lastButtonState == HIGH) {
    if ((millis() - lastDebounce) > DEBOUNCE_DELAY) {
      lastDebounce = millis();
      
      // LED indica leitura
      digitalWrite(LED_PIN, HIGH);
      
      // Publica evento com a tag atual
      publishEvento(nfc_tags[tagIndex]);
      
      // Avança para próxima tag (simula diferentes lotes)
      tagIndex = (tagIndex + 1) % 4;
      
      delay(200);
      digitalWrite(LED_PIN, LOW);
    }
  }
  
  lastButtonState = currentState;
}

// ========================= SETUP & LOOP =========================

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("=========================================");
  Serial.print("  CONTROLE DE ESTOQUE - ");
  Serial.println(PORTAL_LABEL);
  Serial.println("  Simulação Wokwi - FSM e Rastreamento");
  Serial.println("=========================================");

  // Configura pinos
  pinMode(NFC_BTN_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Monta tópico MQTT
  snprintf(topic_evento, sizeof(topic_evento), "cadeiafrio/%s/evento", PORTAL_NOME);

  // Conecta WiFi e MQTT
  setup_wifi();
  mqttClient.setServer(mqtt_server, mqtt_port);

  Serial.println();
  Serial.println("[Info] Pressione o botão para simular leitura NFC");
  Serial.print("[Info] Tópico: ");
  Serial.println(topic_evento);
  Serial.println();
}

void loop() {
  // Mantém conexão MQTT
  if (!mqttClient.connected()) {
    mqtt_reconnect();
  }
  mqttClient.loop();

  // Verifica botão NFC
  checkNfcButton();
}
