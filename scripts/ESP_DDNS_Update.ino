/*******************************************************************************
 * Actualización de DDNS desde ESP32/ESP8266 con WLED
 *******************************************************************************
 * Este código permite que tu ESP actualice automáticamente DuckDNS
 * sin necesidad de un dispositivo intermedio.
 *
 * IMPORTANTE: Este es código de EJEMPLO para integrar en WLED o usar
 * como proyecto standalone que corra en paralelo en el ESP.
 *
 * Para ESP32: Puede correr en un core separado
 * Para ESP8266: Se ejecuta en el loop principal
 ******************************************************************************/

#include <WiFi.h>          // Para ESP32
// #include <ESP8266WiFi.h> // Para ESP8266
#include <HTTPClient.h>

// ============================================================================
// CONFIGURACIÓN - MODIFICA ESTOS VALORES
// ============================================================================

// WiFi
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";

// DuckDNS
const char* duckdns_domain = "mi-arbol-navidad";  // Tu subdominio (sin .duckdns.org)
const char* duckdns_token = "TU-TOKEN-AQUI";      // Tu token de DuckDNS

// Configuración de actualización
const unsigned long UPDATE_INTERVAL = 5 * 60 * 1000;  // 5 minutos en milisegundos
unsigned long lastUpdate = 0;

// Variables globales
String currentIP = "";

// ============================================================================
// SETUP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n========================================");
  Serial.println("  ESP DDNS Auto-Update for WLED");
  Serial.println("========================================\n");

  // Conectar a WiFi
  connectWiFi();

  // Primera actualización
  updateDDNS();
}

// ============================================================================
// LOOP
// ============================================================================

void loop() {
  // Verificar conexión WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi desconectado, reconectando...");
    connectWiFi();
  }

  // Actualizar DDNS cada X minutos
  if (millis() - lastUpdate >= UPDATE_INTERVAL) {
    updateDDNS();
  }

  // Aquí puedes agregar el resto del código de WLED
  // o dejarlo vacío si lo integras directamente en WLED

  delay(1000); // Pequeño delay para no saturar el CPU
}

// ============================================================================
// FUNCIONES
// ============================================================================

void connectWiFi() {
  Serial.print("🔌 Conectando a WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" ✅");
    Serial.print("   IP Local: ");
    Serial.println(WiFi.localIP());
    Serial.print("   Señal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm\n");
  } else {
    Serial.println(" ❌");
    Serial.println("   Error: No se pudo conectar a WiFi");
    Serial.println("   Reintentando en 10 segundos...\n");
    delay(10000);
    ESP.restart();
  }
}

void updateDDNS() {
  Serial.println("========================================");
  Serial.println("  Actualizando DDNS");
  Serial.println("========================================");

  // Obtener IP pública
  String publicIP = getPublicIP();

  if (publicIP.length() == 0) {
    Serial.println("❌ Error: No se pudo obtener IP pública\n");
    return;
  }

  // Solo actualizar si la IP cambió
  if (publicIP == currentIP) {
    Serial.println("✓ IP sin cambios, no es necesario actualizar");
    Serial.println("  IP actual: " + currentIP + "\n");
    lastUpdate = millis();
    return;
  }

  Serial.println("🔄 IP cambió, actualizando DuckDNS...");
  Serial.println("   IP anterior: " + (currentIP.length() > 0 ? currentIP : "ninguna"));
  Serial.println("   IP nueva: " + publicIP);

  // Actualizar DuckDNS
  if (updateDuckDNS(publicIP)) {
    currentIP = publicIP;
    Serial.println("✅ DDNS actualizado exitosamente!");
    Serial.println("   Dominio: " + String(duckdns_domain) + ".duckdns.org");
    Serial.println("   IP: " + currentIP);
  } else {
    Serial.println("❌ Error al actualizar DDNS");
  }

  Serial.println("========================================\n");
  lastUpdate = millis();
}

String getPublicIP() {
  HTTPClient http;
  String ip = "";

  Serial.println("🔍 Obteniendo IP pública...");

  http.begin("http://api.ipify.org");
  int httpCode = http.GET();

  if (httpCode == 200) {
    ip = http.getString();
    ip.trim();
    Serial.println("   IP pública: " + ip);
  } else {
    Serial.println("   Error HTTP: " + String(httpCode));
  }

  http.end();
  return ip;
}

bool updateDuckDNS(String ip) {
  HTTPClient http;

  // Construir URL de actualización
  String url = "http://www.duckdns.org/update?domains=" + String(duckdns_domain) +
               "&token=" + String(duckdns_token) +
               "&ip=" + ip;

  Serial.println("📤 Actualizando DuckDNS...");

  http.begin(url);
  int httpCode = http.GET();

  bool success = false;

  if (httpCode == 200) {
    String response = http.getString();
    response.trim();

    if (response == "OK") {
      success = true;
    } else {
      Serial.println("   Respuesta inesperada: " + response);
    }
  } else {
    Serial.println("   Error HTTP: " + String(httpCode));
  }

  http.end();
  return success;
}

// ============================================================================
// VERSIÓN PARA ESP32 CON DUAL CORE (OPCIONAL)
// ============================================================================

#ifdef ESP32

// Si quieres que la actualización de DDNS corra en un core separado:

void ddnsTask(void * parameter) {
  while(true) {
    if (WiFi.status() == WL_CONNECTED) {
      updateDDNS();
    }

    // Esperar el intervalo de actualización
    vTaskDelay(UPDATE_INTERVAL / portTICK_PERIOD_MS);
  }
}

void setupDualCore() {
  // Crear tarea en Core 0 (WLED corre en Core 1)
  xTaskCreatePinnedToCore(
    ddnsTask,           // Función
    "DDNS Update",      // Nombre
    10000,              // Stack size
    NULL,               // Parámetros
    1,                  // Prioridad
    NULL,               // Handle
    0                   // Core (0 = segundo core)
  );
}

// Llamar setupDualCore() en setup() para usar esta característica

#endif

// ============================================================================
// NOTAS DE INTEGRACIÓN CON WLED
// ============================================================================

/*
 * OPCIÓN 1: Modificar código de WLED
 * ------------------------------------
 * 1. Abre el archivo "wled00.ino" de tu instalación de WLED
 * 2. Agrega este código en la sección de includes
 * 3. Llama a updateDDNS() desde el loop principal con control de tiempo
 * 4. Compila y sube a tu ESP
 *
 * OPCIÓN 2: Usermod de WLED (Recomendado)
 * -----------------------------------------
 * 1. Crea un usermod siguiendo la documentación de WLED
 * 2. Implementa la actualización de DDNS en el método loop()
 * 3. Añade configuración en la interfaz web de WLED
 *
 * OPCIÓN 3: Firmware separado (Menos recomendado)
 * ------------------------------------------------
 * 1. Usa este código como firmware standalone
 * 2. Problema: Necesitas dos ESP (uno para WLED, otro para DDNS)
 *
 * RECOMENDACIÓN:
 * La mejor opción es usar un script externo (PowerShell/Bash) en un
 * ordenador de tu red local, ya que:
 * - No modifica el código de WLED
 * - Más fácil de mantener
 * - Menor consumo de recursos en el ESP
 * - Más fiable
 *
 * Este código es útil si:
 * - No tienes ningún ordenador siempre encendido
 * - Quieres una solución 100% autónoma
 * - Tienes conocimientos de programación en Arduino
 */

// ============================================================================
// MEMORIA Y RECURSOS
// ============================================================================

/*
 * Consumo aproximado de recursos:
 *
 * ESP32:
 * - RAM: ~2-3 KB
 * - Flash: ~10-15 KB
 * - Compatible con WLED (ambos caben sin problemas)
 *
 * ESP8266:
 * - RAM: ~2-3 KB
 * - Flash: ~10-15 KB
 * - Puede ser justo si WLED está con muchos efectos
 * - Considera reducir UPDATE_INTERVAL para liberar recursos
 *
 * CONSEJO: Si tienes un ESP32, no hay problema.
 *          Si tienes ESP8266, mejor usa script externo.
 */
