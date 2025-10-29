/*******************************************************************************
 * ESP Firebase Bridge para WLED
 *******************************************************************************
 * Este código convierte un ESP32/ESP8266 en un puente entre Firebase Realtime
 * Database y WLED, permitiendo control remoto sin necesidad de port forwarding
 * ni acceso al router.
 *
 * Compatible con:
 * - ESP32 (Recomendado - más memoria y potencia)
 * - ESP8266 (Funciona, pero limitado)
 *
 * Requisitos:
 * - Librería: Firebase Arduino Client Library for ESP8266 and ESP32 (by Mobizt)
 * - WLED corriendo en el mismo ESP o en otro ESP en la red local
 ******************************************************************************/

#if defined(ESP32)
  #include <WiFi.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
#endif

#include <Firebase_ESP_Client.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Provide the token generation process info.
#include "addons/TokenHelper.h"
// Provide the RTDB payload printing info and other helper functions.
#include "addons/RTDBHelper.h"

// ============================================================================
// CONFIGURACIÓN - MODIFICA ESTOS VALORES
// ============================================================================

// WiFi
#define WIFI_SSID "TU_WIFI_NOMBRE"
#define WIFI_PASSWORD "TU_WIFI_PASSWORD"

// Firebase
#define FIREBASE_HOST "tu-proyecto-default-rtdb.firebaseio.com"  // SIN https://
#define FIREBASE_AUTH ""  // Dejar vacío si usas reglas públicas
#define DEVICE_ID "tree1"  // ID único de tu dispositivo

// WLED
#define WLED_IP "192.168.1.100"  // IP del ESP con WLED (o "localhost" si es el mismo)
#define WLED_PORT 80

// Configuración de polling
#define POLL_INTERVAL 2000  // Intervalo en ms para consultar Firebase (2 segundos)
#define WIFI_RECONNECT_INTERVAL 10000  // Reintentar WiFi cada 10s si se desconecta

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================

// Firebase
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Estado
unsigned long lastPollTime = 0;
unsigned long lastCommandTimestamp = 0;
unsigned long lastWiFiCheck = 0;
bool firebaseConnected = false;
String wledUrl;

// Rutas de Firebase
String commandsPath;
String statePath;
String statusPath;

// ============================================================================
// SETUP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  printBanner();

  // Construir rutas de Firebase
  commandsPath = String("/wled/") + DEVICE_ID + "/commands";
  statePath = String("/wled/") + DEVICE_ID + "/state";
  statusPath = String("/wled/") + DEVICE_ID + "/status";

  // Construir URL de WLED
  wledUrl = String("http://") + WLED_IP + ":" + String(WLED_PORT);

  // Conectar WiFi
  connectWiFi();

  // Conectar Firebase
  connectFirebase();

  // Reportar estado inicial
  reportState(true);

  Serial.println("\n✅ Sistema iniciado correctamente");
  Serial.println("🔄 Escuchando comandos de Firebase...\n");
}

// ============================================================================
// LOOP
// ============================================================================

void loop() {
  // Verificar conexión WiFi periódicamente
  if (millis() - lastWiFiCheck >= WIFI_RECONNECT_INTERVAL) {
    lastWiFiCheck = millis();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("⚠️  WiFi desconectado, reconectando...");
      connectWiFi();
      connectFirebase();  // Reconectar Firebase también
    }
  }

  // Polling de comandos desde Firebase
  if (firebaseConnected && (millis() - lastPollTime >= POLL_INTERVAL)) {
    lastPollTime = millis();
    checkForCommands();
  }

  // Pequeño delay para no saturar el CPU
  delay(100);
}

// ============================================================================
// FUNCIONES DE CONEXIÓN
// ============================================================================

void connectWiFi() {
  Serial.println("========================================");
  Serial.println("  Conectando a WiFi");
  Serial.println("========================================");
  Serial.print("SSID: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  Serial.print("Estado: ");
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" ✅");
    Serial.print("✅ WiFi conectado!\n");
    Serial.print("   IP Local: ");
    Serial.println(WiFi.localIP());
    Serial.print("   Señal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    Serial.print("   Gateway: ");
    Serial.println(WiFi.gatewayIP());
  } else {
    Serial.println(" ❌");
    Serial.println("❌ Error: No se pudo conectar a WiFi");
    Serial.println("   Reintentando en 10 segundos...");
    delay(10000);
    ESP.restart();
  }
}

void connectFirebase() {
  Serial.println("\n========================================");
  Serial.println("  Conectando a Firebase");
  Serial.println("========================================");
  Serial.print("Host: ");
  Serial.println(FIREBASE_HOST);

  // Configurar Firebase
  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;

  // Configurar timeout y reintentos
  config.timeout.serverResponse = 10 * 1000;  // 10 segundos
  config.timeout.socketConnection = 10 * 1000;

  // Inicializar Firebase
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Verificar conexión
  if (Firebase.ready()) {
    firebaseConnected = true;
    Serial.println("✅ Firebase conectado exitosamente!");
    Serial.print("   Device ID: ");
    Serial.println(DEVICE_ID);
    Serial.print("   Base Path: /wled/");
    Serial.println(DEVICE_ID);
  } else {
    firebaseConnected = false;
    Serial.println("❌ Error al conectar con Firebase");
    Serial.println("   Verifica:");
    Serial.println("   - FIREBASE_HOST es correcto");
    Serial.println("   - Las reglas de Firebase permiten lectura/escritura");
    Serial.println("   - Tu conexión a internet funciona");
  }
}

// ============================================================================
// FUNCIONES DE FIREBASE
// ============================================================================

void checkForCommands() {
  if (!Firebase.ready()) {
    if (!firebaseConnected) {
      Serial.println("⚠️  Firebase no conectado, reintentando...");
      connectFirebase();
    }
    return;
  }

  // Leer timestamp del último comando
  if (Firebase.RTDB.getInt(&fbdo, commandsPath + "/timestamp")) {
    if (fbdo.dataType() == "int") {
      unsigned long timestamp = fbdo.intData();

      // Solo procesar si es un comando nuevo
      if (timestamp > lastCommandTimestamp) {
        lastCommandTimestamp = timestamp;
        Serial.println("\n📨 ¡Nuevo comando recibido!");
        Serial.print("   Timestamp: ");
        Serial.println(timestamp);

        // Leer el comando completo
        if (Firebase.RTDB.getJSON(&fbdo, commandsPath + "/command")) {
          String commandJson = fbdo.jsonString();
          Serial.println("   Comando: " + commandJson.substring(0, 100) + "...");

          // Marcar como procesando
          updateStatus(true);

          // Enviar a WLED
          bool success = sendToWLED(commandJson);

          // Actualizar estado
          updateStatus(false);

          if (success) {
            Serial.println("✅ Comando ejecutado exitosamente\n");
            reportState(true);
          } else {
            Serial.println("❌ Error al ejecutar comando\n");
            reportState(false);
          }
        } else {
          Serial.println("❌ Error al leer comando desde Firebase");
          Serial.println("   Razón: " + fbdo.errorReason());
        }
      }
    }
  } else {
    // No hay comandos o error
    if (fbdo.errorReason().length() > 0 && fbdo.errorReason() != "path not exist") {
      Serial.println("⚠️  Error al consultar Firebase: " + fbdo.errorReason());
    }
  }
}

void updateStatus(bool processing) {
  if (!Firebase.ready()) return;

  FirebaseJson json;
  json.set("processing", processing);
  json.set("lastCommand", (int)lastCommandTimestamp);
  json.set("timestamp", (int)(millis() / 1000));

  Firebase.RTDB.setJSON(&fbdo, statusPath.c_str(), &json);
}

void reportState(bool connected) {
  if (!Firebase.ready()) return;

  FirebaseJson json;
  json.set("connected", connected);
  json.set("lastUpdate", (int)(millis() / 1000));
  json.set("ip", WiFi.localIP().toString());
  json.set("rssi", WiFi.RSSI());
  json.set("freeHeap", ESP.getFreeHeap());

  if (Firebase.RTDB.setJSON(&fbdo, statePath.c_str(), &json)) {
    Serial.println("📊 Estado reportado a Firebase");
  }
}

// ============================================================================
// FUNCIONES DE WLED
// ============================================================================

bool sendToWLED(String commandJson) {
  Serial.println("📤 Enviando comando a WLED...");
  Serial.print("   URL: ");
  Serial.println(wledUrl + "/json/state");

  HTTPClient http;
  http.begin(wledUrl + "/json/state");
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  int httpCode = http.POST(commandJson);

  bool success = false;

  if (httpCode > 0) {
    Serial.print("   HTTP Response: ");
    Serial.println(httpCode);

    if (httpCode == 200 || httpCode == 201) {
      success = true;
      String response = http.getString();
      Serial.println("   WLED respondió correctamente");
    } else {
      Serial.println("   ⚠️ WLED respondió con código de error");
    }
  } else {
    Serial.print("   ❌ Error HTTP: ");
    Serial.println(http.errorToString(httpCode));
    Serial.println("   Verifica:");
    Serial.println("   - WLED_IP es correcta");
    Serial.println("   - WLED está encendido y accesible");
    Serial.println("   - No hay firewall bloqueando");
  }

  http.end();
  return success;
}

// ============================================================================
// UTILIDADES
// ============================================================================

void printBanner() {
  Serial.println("\n\n");
  Serial.println("========================================");
  Serial.println("   ESP Firebase Bridge para WLED");
  Serial.println("========================================");
  Serial.println("  Control remoto sin port forwarding");
  Serial.println("========================================");
  Serial.print("  Chip: ");
  #ifdef ESP32
    Serial.println("ESP32");
  #else
    Serial.println("ESP8266");
  #endif
  Serial.print("  SDK: ");
  Serial.println(ESP.getSdkVersion());
  Serial.print("  Free Heap: ");
  Serial.print(ESP.getFreeHeap());
  Serial.println(" bytes");
  Serial.println("========================================\n");
}

// ============================================================================
// NOTAS DE USO
// ============================================================================

/*
 * CONFIGURACIÓN RÁPIDA:
 * ---------------------
 * 1. Instala la librería: Firebase Arduino Client Library for ESP8266 and ESP32
 * 2. Configura WiFi: WIFI_SSID y WIFI_PASSWORD
 * 3. Configura Firebase: FIREBASE_HOST (sin https://)
 * 4. Configura WLED: WLED_IP (IP del ESP con WLED)
 * 5. Compila y sube al ESP
 * 6. Abre Monitor Serie (115200 baud)
 * 7. Verifica que conecte a WiFi y Firebase
 *
 * VERIFICACIÓN:
 * -------------
 * En el Monitor Serie deberías ver:
 * - ✅ WiFi conectado
 * - ✅ Firebase conectado
 * - 🔄 Escuchando comandos
 *
 * Cuando cambies algo en la web:
 * - 📨 Nuevo comando recibido
 * - 📤 Enviando a WLED
 * - ✅ Comando ejecutado exitosamente
 *
 * SOLUCIÓN DE PROBLEMAS:
 * ----------------------
 *
 * "WiFi no conecta":
 * - Verifica SSID y contraseña
 * - ESP8266 solo funciona en 2.4GHz
 * - Verifica señal WiFi
 *
 * "Firebase no conecta":
 * - Verifica FIREBASE_HOST (sin https://, sin / al final)
 * - Verifica reglas de Firebase (deben permitir lectura/escritura)
 * - Verifica conexión a internet del ESP
 *
 * "No recibe comandos":
 * - Verifica que DEVICE_ID sea el mismo en web y ESP
 * - Verifica en Firebase Console que se escriban los comandos
 * - Verifica que el timestamp se actualice
 *
 * "No se envía a WLED":
 * - Verifica WLED_IP
 * - Verifica que WLED esté accesible (ping, navegador)
 * - Verifica que WLED esté en la misma red
 *
 * OPTIMIZACIONES:
 * ---------------
 *
 * Para ESP8266 con poca memoria:
 * - Reduce POLL_INTERVAL a 3000 o 5000
 * - Desactiva debug serial (comenta los Serial.println)
 * - Reduce tamaño de buffers JSON
 *
 * Para reducir consumo de Firebase:
 * - Aumenta POLL_INTERVAL a 5000 o 10000
 * - Implementa long polling con Firebase listeners (más complejo)
 *
 * ARQUITECTURA:
 * -------------
 *
 * Opción A - ESP Separado (Este código):
 * [ESP con este código] → HTTP → [ESP con WLED]
 *         ↕
 *    [Firebase]
 *
 * Ventajas:
 * - No modifica WLED
 * - Fácil de actualizar
 * - Más estable
 *
 * Opción B - Mismo ESP (Requiere modificar WLED):
 * [ESP con WLED + Firebase integrado]
 *              ↕
 *         [Firebase]
 *
 * Ventajas:
 * - Solo un ESP
 * - Menor latencia
 * - Menos cableado
 *
 * Desventajas:
 * - Requiere modificar código de WLED
 * - Más complejo de mantener
 * - Se pierde en actualizaciones de WLED
 *
 * CONSUMO DE RECURSOS:
 * --------------------
 *
 * ESP32:
 * - RAM: ~40-50 KB
 * - Flash: ~200-300 KB
 * - CPU: ~5% promedio
 * ✅ Muy cómodo, sin problemas
 *
 * ESP8266:
 * - RAM: ~30-40 KB
 * - Flash: ~200-300 KB
 * - CPU: ~10-15% promedio
 * ⚠️ Ajustado pero funcional
 *
 * SEGURIDAD:
 * ----------
 *
 * Este código usa autenticación básica de Firebase.
 * Para mayor seguridad:
 * 1. Configura reglas de Firebase más restrictivas
 * 2. Usa Firebase Authentication
 * 3. Implementa tokens de acceso
 * 4. Encripta datos sensibles
 *
 * Ver FIREBASE_SETUP.md para más información.
 */
