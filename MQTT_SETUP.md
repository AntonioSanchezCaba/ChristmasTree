# Configuración MQTT para WLED (URLs Cortas)

## Problema con HiveMQ Cloud

Los clusters personales de HiveMQ tienen URLs muy largas que **superan el límite de caracteres** de WLED:

```
❌ 90717923c01b4a4da3718559007344ac.s1.eu.hivemq.cloud (50+ caracteres)
```

## Solución: Brokers Públicos con URLs Cortas

Usa estos brokers MQTT públicos que **SÍ caben** en WLED:

---

### Opción 1: Eclipse Mosquitto (RECOMENDADO)

**Broker:** `test.mosquitto.org`
**Puerto:** `1883` (sin SSL) o `8883` (con SSL)
**Usuario:** *(vacío)*
**Contraseña:** *(vacío)*

✅ **Pros:**
- URL corta (19 caracteres)
- Muy estable
- Comunidad grande
- Gratuito siempre

⚠️ **Contras:**
- Público (sin autenticación)
- Usa un topic único para tu seguridad

---

### Opción 2: HiveMQ Public Broker

**Broker:** `broker.hivemq.com`
**Puerto:** `1883`
**Usuario:** *(vacío)*
**Contraseña:** *(vacío)*

✅ **Pros:**
- URL muy corta (17 caracteres)
- Infraestructura de HiveMQ
- Muy rápido
- Gratuito

⚠️ **Contras:**
- Público (sin autenticación)
- Usa un topic único

---

### Opción 3: Eclipse IoT

**Broker:** `mqtt.eclipseprojects.io`
**Puerto:** `1883` o `8883`
**Usuario:** *(vacío)*
**Contraseña:** *(vacío)*

✅ **Pros:**
- Proyecto Eclipse oficial
- Estable

⚠️ **Contras:**
- URL un poco más larga (24 caracteres)
- Público (sin autenticación)

---

## Configuración en WLED (Paso a Paso)

### Paso 1: Acceder a WLED

1. Conecta tu ordenador/móvil a la misma red WiFi que el ESP
2. Abre navegador y ve a: `http://192.168.1.100` (o la IP de tu ESP)
3. Si no sabes la IP:
   - Busca en la lista de dispositivos de tu router
   - O usa app "WLED" desde móvil (detecta automáticamente)

### Paso 2: Configurar MQTT

1. En WLED, click en **"Config"** (icono de engranaje)
2. Click en **"Sync Interfaces"**
3. Baja hasta la sección **"MQTT"**

### Paso 3: Configurar Broker

Introduce estos datos (usa uno de los brokers de arriba):

```
┌─────────────────────────────────────────────┐
│ Enable MQTT              [✓]                │
│                                             │
│ Broker:                                     │
│ [test.mosquitto.org________________]       │ ← Broker (elige uno)
│                                             │
│ Port:                                       │
│ [1883___]                                   │ ← Puerto
│                                             │
│ Username:                                   │
│ [__________________________________]        │ ← Dejar VACÍO
│                                             │
│ Password:                                   │
│ [__________________________________]        │ ← Dejar VACÍO
│                                             │
│ Client ID:                                  │
│ [wled_tree_antonio_12345___________]       │ ← ID único
│                                             │
│ Device Topic:                               │
│ [wled/antonio/tree1________________]       │ ← Topic único
│                                             │
│ Group Topic:                                │
│ [wled/antonio/all__________________]       │ ← Topic de grupo
│                                             │
└─────────────────────────────────────────────┘
```

### Paso 4: Valores Específicos

**Para seguridad, usa topics ÚNICOS**. Aquí tienes ejemplos:

#### Client ID (debe ser único):
```
wled_tree_antonio_12345
wled_navidad_casa_789
wled_arbol_living_abc
```
**Tip:** Añade números aleatorios al final

#### Device Topic (para comandos individuales):
```
wled/antonio/tree1
wled/tuhombre/arbol
wled/casa123/navidad
```

#### Group Topic (para comandos a varios dispositivos):
```
wled/antonio/all
wled/tuhombre/all
wled/casa123/all
```

**IMPORTANTE:** Usa tu nombre o identificador único en lugar de "antonio" para evitar conflictos con otros usuarios.

### Paso 5: Guardar y Reiniciar

1. Click en **"Save"** al final de la página
2. WLED se reiniciará automáticamente
3. Espera 10-20 segundos

### Paso 6: Verificar Conexión

1. Vuelve a entrar a WLED
2. Ve a **Info**
3. Busca la sección **MQTT**
4. Debería decir: **"Connected"** o **"Conectado"**

Si dice **"Disconnected"** o **"Error"**:
- Verifica que el ESP tenga acceso a internet
- Verifica que el broker esté escrito correctamente
- Revisa la sección "Solución de Problemas" más abajo

---

## Configuración en la Aplicación Web

### Opción A: Usar el broker público configurado

Abre `index.html` y busca esta sección (línea ~593):

```javascript
function initMQTT() {
    console.log('🔌 Iniciando conexión MQTT...');

    let broker, username, password;

    if (connectionMode === 'mqtt-public') {
        // Mosquitto test broker
        broker = 'wss://test.mosquitto.org:8081/mqtt';  // ← WebSocket
        username = '';
        password = '';
    }
```

**IMPORTANTE:** La web usa **WebSocket** (puerto 8081) mientras WLED usa **TCP** (puerto 1883). Ambos se conectan al mismo broker.

### Opción B: Configurar manualmente en la web

1. Abre `index.html` en tu navegador
2. Selecciona modo **"MQTT Público"**
3. ¡Ya debería funcionar!

---

## Topics MQTT - Cómo Funciona

WLED usa estos topics:

### Para enviar comandos (Web → WLED):
```
wled/antonio/tree1/api
```

Publica comandos JSON como:
```json
{"on": true, "bri": 128, "seg": [{"col": [[255,0,0]]}]}
```

### Para recibir estado (WLED → Web):
```
wled/antonio/tree1/v
wled/antonio/tree1/status
```

**La aplicación web ya maneja todo esto automáticamente.**

---

## Seguridad con Brokers Públicos

Los brokers públicos **no tienen autenticación**, pero puedes protegerte:

### 1. Usa Topics Únicos y Difíciles de Adivinar

❌ **Malo:**
```
wled/tree
wled/lights
wled/esp
```

✅ **Bueno:**
```
wled/antonio_xk7p92/tree1
wled/miCasa_2024_abc/navidad
wled/secreto_8x9z/arbol
```

### 2. No pongas información sensible

Los brokers públicos pueden ser leídos por cualquiera. Solo úsalos para:
- ✅ Controlar luces
- ✅ Proyectos no críticos
- ❌ Datos personales
- ❌ Controles de seguridad (cerraduras, alarmas)

### 3. Cambia el topic periódicamente

Si sospechas que alguien descubrió tu topic, cámbialo en WLED.

---

## Solución de Problemas

### WLED no se conecta al broker

**Síntomas:** En WLED → Info → MQTT dice "Disconnected"

**Soluciones:**

1. **Verifica acceso a internet del ESP:**
   ```
   - Abre WLED → Info
   - Busca "Gateway" y "DNS"
   - Deberían tener IPs válidas (ej: 192.168.1.1, 8.8.8.8)
   ```

2. **Verifica el broker:**
   ```
   - Debe ser exactamente: test.mosquitto.org
   - Sin espacios antes/después
   - Sin https:// ni / al final
   - Minúsculas
   ```

3. **Verifica el puerto:**
   ```
   - Debe ser: 1883
   - No 8883 (a menos que uses SSL)
   - No 8081 (ese es para WebSocket)
   ```

4. **Prueba otro broker:**
   - Cambia a `broker.hivemq.com`
   - A veces un broker está caído

5. **Verifica firewall del router:**
   - Algunos routers bloquean puerto 1883
   - Llama a tu ISP si es necesario

---

### La web no se conecta

**Síntomas:** En la web dice "Error MQTT" o "Desconectado"

**Soluciones:**

1. **Verifica que uses el puerto WebSocket:**
   ```javascript
   // CORRECTO:
   broker = 'wss://test.mosquitto.org:8081/mqtt';

   // INCORRECTO:
   broker = 'test.mosquitto.org';  // Falta wss:// y puerto
   ```

2. **Abre la consola del navegador:**
   - Presiona F12
   - Ve a pestaña "Console"
   - Busca errores MQTT
   - Compártelos si necesitas ayuda

3. **Verifica CORS:**
   - Algunos navegadores bloquean WebSocket
   - Prueba con Chrome o Firefox

---

### WLED conecta pero no recibe comandos

**Síntomas:** WLED dice "Connected" pero no cambia al dar órdenes desde la web

**Soluciones:**

1. **Verifica que los topics coincidan:**

   **En WLED:**
   ```
   Device Topic: wled/antonio/tree1
   ```

   **En index.html (línea ~542):**
   ```javascript
   mqttClient.publish('wled/antonio/tree1/api', payloadStr);
   ```

   ¡Deben ser **exactamente iguales**!

2. **Verifica el formato del comando:**

   WLED espera JSON válido:
   ```json
   {"on":true,"bri":128}
   ```

   Abre consola del navegador y verifica que se envíe correctamente.

3. **Prueba con MQTT Explorer:**

   Descarga [MQTT Explorer](http://mqtt-explorer.com/) y conéctate al broker:
   - Host: `test.mosquitto.org`
   - Port: `1883`
   - Publica manualmente en `wled/antonio/tree1/api`
   - Si funciona, el problema está en la web

---

### Latencia alta o comandos lentos

**Síntomas:** Los comandos tardan >5 segundos

**Soluciones:**

1. **Verifica conexión a internet del ESP:**
   - WiFi débil = latencia alta
   - Acerca el ESP al router
   - O usa repetidor WiFi

2. **Cambia de broker:**
   ```
   test.mosquitto.org  → Servidores en UK
   broker.hivemq.com   → Servidores globales (más rápido)
   ```

3. **Verifica QoS:**
   - En el código, usa QoS 0 (más rápido) en lugar de QoS 1
   - Línea en index.html:
   ```javascript
   mqttClient.publish('wled/tree/api', payloadStr, { qos: 0 });
   ```

---

## Comparación de Brokers Públicos

| Broker | URL | Longitud | Puerto TCP | Puerto WS | Estabilidad |
|--------|-----|----------|------------|-----------|-------------|
| **Mosquitto** | test.mosquitto.org | 19 chars | 1883 | 8081 | ⭐⭐⭐⭐⭐ |
| **HiveMQ Public** | broker.hivemq.com | 17 chars | 1883 | 8000 | ⭐⭐⭐⭐⭐ |
| **Eclipse IoT** | mqtt.eclipseprojects.io | 24 chars | 1883 | 443 | ⭐⭐⭐⭐ |

**Recomendación:** Usa **test.mosquitto.org** - Es el más usado y documentado.

---

## Configuración de Topics en index.html

Si cambiaste los topics en WLED, debes cambiarlos también en la web.

Busca en `index.html` (líneas ~540-545):

```javascript
async function sendViaMQTT(payload) {
    const payloadStr = JSON.stringify(payload);
    console.log('📤 MQTT → Enviando:', payloadStr.substring(0, 100));

    try {
        // CAMBIA ESTO si usas topics diferentes:
        mqttClient.publish('wled/antonio/tree1/api', payloadStr, { qos: 1, retain: false });
        //                  ^^^^^^^^^^^^^^^^^^^^^^
        //                  Debe coincidir con "Device Topic" en WLED + "/api"
```

**Formato:**
```
[Device Topic en WLED] + "/api"

Ejemplos:
wled/antonio/tree1  → wled/antonio/tree1/api
wled/casa/navidad   → wled/casa/navidad/api
wled/usuario/luces  → wled/usuario/luces/api
```

---

## Alternativa: Usar IP del Broker (Avanzado)

Si el broker público tiene un dominio largo pero una IP corta, puedes usar la IP directamente:

### Encontrar IP del broker:

```bash
# Windows
nslookup test.mosquitto.org

# Linux/Mac
dig test.mosquitto.org

# Resultado ejemplo:
# test.mosquitto.org → 91.121.93.94
```

### Usar IP en WLED:

```
Broker: 91.121.93.94
Port: 1883
```

⚠️ **Advertencia:** Las IPs de los brokers pueden cambiar. Solo usa esto si es necesario.

---

## Resumen de Configuración Rápida

### En WLED:
```
Broker:        test.mosquitto.org
Port:          1883
Username:      (vacío)
Password:      (vacío)
Client ID:     wled_miNombre_123
Device Topic:  wled/miNombre/tree1
Group Topic:   wled/miNombre/all
```

### En la Web:
```javascript
// index.html (línea ~593)
broker = 'wss://test.mosquitto.org:8081/mqtt';

// index.html (línea ~542)
mqttClient.publish('wled/miNombre/tree1/api', ...);
```

### Verificación:
1. WLED → Info → MQTT → Debería decir "Connected"
2. Web → Selecciona "MQTT Público"
3. Cambia un color
4. ¡Debería funcionar!

---

## Próximos Pasos

1. ✅ Elige un broker (recomiendo `test.mosquitto.org`)
2. ✅ Configúralo en WLED (5 minutos)
3. ✅ Verifica que WLED diga "Connected"
4. ✅ Actualiza topics en `index.html` si es necesario
5. ✅ Abre la web y selecciona "MQTT Público"
6. ✅ ¡Controla tus luces desde cualquier lugar!

---

## ¿Necesitas Ayuda?

Si tienes problemas:

1. Verifica cada paso sistemáticamente
2. Abre consola del navegador (F12) y busca errores
3. Verifica en WLED → Info que diga "MQTT: Connected"
4. Comparte los errores específicos que veas

---

**¿Listo?** Configura WLED con `test.mosquitto.org` y pruébalo. Es la solución más simple sin acceso al router. 🚀
