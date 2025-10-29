# Configuración ESP-WLED con Firebase (Sin Acceso al Router)

## Resumen

Esta solución te permite controlar tu ESP con WLED desde internet **sin necesidad de acceso al router**, usando Firebase Realtime Database como intermediario.

## ¿Por qué Firebase?

- ✅ **No requiere acceso al router** (sin port forwarding)
- ✅ **No usa MQTT**
- ✅ **No necesita dispositivo siempre encendido** (solo el ESP)
- ✅ **Funciona detrás de cualquier NAT/firewall**
- ✅ **Plan gratuito generoso** (100 conexiones simultáneas, 1GB descarga/día)
- ✅ **Latencia baja** (1-3 segundos)
- ✅ **Acceso desde cualquier lugar del mundo**

## Arquitectura

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Navegador  │────────▶│  Firebase Cloud  │◀────────│  ESP+WLED   │
│  (Tu móvil) │         │  Realtime DB     │         │  (En casa)  │
└─────────────┘         └──────────────────┘         └─────────────┘
     Escribe                Base de datos              Lee cada
     comandos               en la nube                 1-2 segundos
```

### Flujo de funcionamiento:

1. **Tú** (desde móvil/PC): Cambias un color en la web
2. **Web App**: Escribe el comando en Firebase: `{color: [255,0,0]}`
3. **Firebase**: Almacena el comando en la nube
4. **ESP**: Consulta Firebase cada 1 segundo, ve el comando nuevo
5. **ESP**: Ejecuta el comando en WLED
6. **ESP**: Reporta el estado actual a Firebase
7. **Web App**: Lee el estado y actualiza la interfaz

---

## Paso 1: Crear Proyecto en Firebase

### 1.1. Acceder a Firebase Console

Ve a: **https://console.firebase.google.com**

Inicia sesión con tu cuenta de Google.

### 1.2. Crear Nuevo Proyecto

1. Click en **"Agregar proyecto"** o **"Create a project"**
2. Nombre del proyecto: `wled-christmas-tree` (o el que prefieras)
3. Click **"Continuar"**
4. **Desactiva Google Analytics** (no lo necesitamos)
5. Click **"Crear proyecto"**
6. Espera 30-60 segundos a que se cree

### 1.3. Configurar Realtime Database

1. En el menú lateral, busca **"Realtime Database"**
2. Click **"Crear base de datos"**
3. Ubicación: Elige la más cercana a tu país:
   - Europa: `europe-west1`
   - USA: `us-central1`
   - Otro: Elige el disponible más cercano
4. Modo de seguridad: **"Comenzar en modo de prueba"**
   - Esto permite lectura/escritura sin autenticación (cambiaremos las reglas después)
5. Click **"Habilitar"**

### 1.4. Obtener Configuración

1. En la consola, ve a **"Configuración del proyecto"** (icono de engranaje arriba a la izquierda)
2. Baja hasta **"Tus apps"**
3. Click en el icono **Web** (`</>`)
4. Nombre de la app: `wled-web-controller`
5. **NO** marques "También configurar Firebase Hosting"
6. Click **"Registrar app"**
7. **Copia todo el objeto `firebaseConfig`**:

```javascript
const firebaseConfig = {
  apiKey: "AIza...tu-api-key...Abc123",
  authDomain: "tu-proyecto.firebaseapp.com",
  databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

**IMPORTANTE**: Guarda esta configuración, la necesitarás más adelante.

---

## Paso 2: Configurar Reglas de Seguridad

Por defecto, el modo de prueba expira en 30 días. Configuremos reglas más seguras pero funcionales.

### 2.1. Reglas Recomendadas (Seguridad Básica)

1. En Firebase Console, ve a **"Realtime Database"**
2. Pestaña **"Reglas"**
3. Reemplaza las reglas con esto:

```json
{
  "rules": {
    "wled": {
      "$device_id": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

4. Click **"Publicar"**

### 2.2. Reglas Avanzadas (Más Seguras - Opcional)

Si quieres más seguridad, usa estas reglas con una "contraseña" simple:

```json
{
  "rules": {
    "wled": {
      "$device_id": {
        ".read": "root.child('auth').child($device_id).val() === 'tu-password-secreta'",
        ".write": "root.child('auth').child($device_id).val() === 'tu-password-secreta'"
      }
    }
  }
}
```

Luego, en la base de datos, crea manualmente este nodo:
```
/auth
  /tree1: "tu-password-secreta"
```

---

## Paso 3: Estructura de Datos en Firebase

Firebase organizará los datos así:

```
/wled
  /tree1                          ← ID de tu dispositivo
    /commands                     ← Comandos desde la web
      /timestamp: 1234567890
      /command: {...}             ← Comando JSON de WLED
    /state                        ← Estado actual del ESP
      /connected: true
      /lastUpdate: 1234567890
      /brightness: 128
      /ledCount: 200
    /status                       ← Estado de ejecución
      /lastCommand: 1234567890
      /processing: false
```

**No necesitas crear nada manualmente**, la app y el ESP lo crearán automáticamente.

---

## Paso 4: Configurar la Web App

### 4.1. Abrir el archivo `index.html`

Busca la sección de configuración de Firebase (está comentada).

### 4.2. Agregar tu configuración

Reemplaza esto:
```javascript
// Configura tu Firebase aquí:
const firebaseConfig = {
  apiKey: "TU-API-KEY",
  // ... resto de la configuración
};
```

Con tu configuración real que copiaste en el Paso 1.4.

### 4.3. Guardar el archivo

¡Ya está! La web app ya puede comunicarse con Firebase.

---

## Paso 5: Configurar el ESP con WLED

### 5.1. Obtener la librería Firebase para Arduino

1. Abre **Arduino IDE**
2. Ve a **Herramientas → Administrar Bibliotecas**
3. Busca: **`Firebase Arduino Client Library for ESP8266 and ESP32`**
4. Instala la versión más reciente (by Mobizt)

### 5.2. Abrir el código del ESP

Abre el archivo: `scripts/ESP_Firebase_WLED.ino`

### 5.3. Configurar WiFi y Firebase

Edita estas líneas:

```cpp
// WiFi
#define WIFI_SSID "TU_WIFI_NOMBRE"
#define WIFI_PASSWORD "TU_WIFI_PASSWORD"

// Firebase
#define FIREBASE_HOST "tu-proyecto-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH ""  // Dejar vacío si usas reglas básicas
#define DEVICE_ID "tree1"
```

**IMPORTANTE**:
- `FIREBASE_HOST`: Es tu `databaseURL` del firebaseConfig, **sin** `https://`
- `FIREBASE_AUTH`: Deja vacío (`""`) si usas las reglas básicas
- `DEVICE_ID`: Identificador único para tu árbol (si tienes varios)

### 5.4. Configurar WLED

El código asume que WLED está corriendo en el mismo ESP. Hay dos formas:

#### Opción A: ESP separado (Recomendado)
- Un ESP corre WLED
- Otro ESP corre el código de Firebase y envía comandos HTTP a WLED
- Edita esta línea:
```cpp
#define WLED_IP "192.168.1.100"  // IP del ESP con WLED
```

#### Opción B: Mismo ESP (Avanzado)
- Integra el código de Firebase directamente en WLED como usermod
- Requiere conocimientos avanzados de programación

### 5.5. Subir el código al ESP

1. Conecta el ESP al ordenador
2. Selecciona la placa correcta:
   - **Herramientas → Placa → ESP32 Dev Module** (para ESP32)
   - **Herramientas → Placa → NodeMCU 1.0** (para ESP8266)
3. Selecciona el puerto COM correcto
4. Click **Subir** ↑
5. Espera a que termine

### 5.6. Verificar funcionamiento

1. Abre **Monitor Serie** (baudrate: 115200)
2. Deberías ver:
```
🚀 Iniciando ESP Firebase Bridge...
🔌 Conectando a WiFi...
✅ WiFi conectado!
   IP: 192.168.1.xxx
🔥 Conectando a Firebase...
✅ Firebase conectado!
🔄 Escuchando comandos...
```

---

## Paso 6: Probar la Conexión

### 6.1. Abrir la Web App

1. Abre `index.html` en tu navegador
2. Selecciona modo **"Firebase Cloud"**
3. Verifica que aparezca **"✅ Conectado a Firebase"**

### 6.2. Enviar un Comando de Prueba

1. Cambia el color a ROJO
2. En el Monitor Serie del ESP deberías ver:
```
📨 Nuevo comando recibido!
   Color: [255,0,0]
📤 Enviando a WLED...
✅ Comando ejecutado exitosamente
```

3. El árbol debería cambiar a rojo

### 6.3. Verificar en Firebase Console

1. Ve a Firebase Console → Realtime Database
2. Deberías ver la estructura de datos:
```
/wled
  /tree1
    /commands
      /timestamp: ...
    /state
      /connected: true
```

---

## Solución de Problemas

### Error: "Firebase connection failed"

**Causas posibles:**
1. `FIREBASE_HOST` incorrecto
   - ✅ Verificar que NO tenga `https://` ni `/` al final
   - ✅ Debe ser: `tu-proyecto-default-rtdb.firebaseio.com`

2. Reglas de seguridad bloquean acceso
   - ✅ Verificar reglas en Firebase Console
   - ✅ Temporalmente usar reglas abiertas para probar:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```

3. Sin conexión a internet
   - ✅ Verificar que el ESP tenga acceso a internet
   - ✅ Probar hacer ping a Google: `ping 8.8.8.8`

### Error: "WiFi connection failed"

- ✅ Verificar SSID y contraseña
- ✅ Verificar que la red sea 2.4GHz (ESP8266 no soporta 5GHz)
- ✅ Verificar señal WiFi suficiente

### El ESP se conecta pero no recibe comandos

1. **Verificar que la web escriba en Firebase:**
   - Abre Firebase Console → Realtime Database
   - Cambia un color en la web
   - Deberías ver el nodo `/commands` aparecer/actualizarse

2. **Verificar que el ESP lea de Firebase:**
   - En Monitor Serie, busca: `🔄 Polling Firebase...`
   - Debería aparecer cada 1-2 segundos

3. **Verificar DEVICE_ID:**
   - Debe ser el mismo en el código del ESP y la web

### Latencia alta (>5 segundos)

- Reduce el intervalo de polling:
```cpp
#define POLL_INTERVAL 1000  // 1 segundo (en lugar de 2000)
```

- **CUIDADO**: Intervalos muy bajos (<500ms) pueden consumir mucha cuota de Firebase

### ESP se reinicia constantemente

**Causas:**
1. Fuente de alimentación insuficiente
   - ✅ Usa fuente de 5V con al menos 2A
2. Memoria insuficiente (ESP8266)
   - ✅ Reduce el tamaño del buffer
   - ✅ Considera usar ESP32 en su lugar

---

## Límites del Plan Gratuito de Firebase

Firebase ofrece un plan gratuito muy generoso:

### Realtime Database - Plan Spark (Gratis)
- **Conexiones simultáneas**: 100
- **GB almacenados**: 1 GB
- **GB descargados/mes**: 10 GB/mes
- **Operaciones de escritura**: Ilimitadas*
- **Operaciones de lectura**: Ilimitadas*

\* Aunque ilimitadas, pueden aplicar límites de tasa

### ¿Es suficiente para este proyecto?

**Consumo estimado con 1 ESP polling cada 2 segundos:**

- **Lecturas/día**: ~43,200 (2 por segundo × 86,400 segundos)
- **Tamaño por lectura**: ~1-5 KB
- **Descarga/día**: ~50-250 MB
- **Descarga/mes**: ~1.5-7.5 GB

**Conclusión**: ✅ Suficiente para 1-5 dispositivos sin problemas.

### Optimizar Consumo

Si te acercas a los límites:

1. **Aumentar intervalo de polling:**
```cpp
#define POLL_INTERVAL 5000  // 5 segundos
```

2. **Solo leer cuando hay cambios** (requiere webhook o Firebase Functions - plan Blaze)

3. **Usar compresión de datos**

---

## Seguridad Avanzada

### Opción 1: Autenticación Anónima

1. En Firebase Console: **Authentication → Sign-in method**
2. Habilita **"Anónimo"**
3. Actualiza reglas:
```json
{
  "rules": {
    "wled": {
      "$device_id": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

### Opción 2: Token de Acceso Personalizado

1. Genera un token único para tu dispositivo
2. Guárdalo en el código del ESP y la web
3. Usa reglas que validen el token

Ver: [Firebase Security Rules](https://firebase.google.com/docs/database/security)

---

## Ventajas vs Desventajas

### ✅ Ventajas

1. **No requiere acceso al router**: Funciona en cualquier red
2. **Sin MQTT**: Solución más simple
3. **Sin dispositivo intermedio**: Solo necesitas el ESP
4. **Gratuito**: Para uso personal es gratis
5. **Acceso global**: Funciona desde cualquier lugar
6. **Escalable**: Puedes controlar múltiples dispositivos
7. **Confiable**: Infraestructura de Google

### ⚠️ Desventajas

1. **Latencia**: 1-3 segundos (vs <100ms con port forwarding)
2. **Dependencia de terceros**: Requiere Google/Firebase
3. **Límites del plan gratuito**: Aunque generosos, existen
4. **Requiere internet**: Si se cae internet, no funciona local

### 📊 Comparación con Otras Soluciones

| Característica | Firebase | Port Forwarding | MQTT |
|---------------|----------|-----------------|------|
| Acceso al router | ❌ No | ✅ Sí | ❌ No |
| Latencia | 1-3s | <100ms | <500ms |
| Dispositivo intermedio | ❌ No | ❌ No | ✅ Sí (broker) |
| Complejidad | ⭐⭐ Media | ⭐⭐⭐ Alta | ⭐⭐⭐ Alta |
| Coste | 💰 Gratis | 💰 Gratis | 💰 Gratis/Pago |
| Funciona sin internet local | ❌ No | ✅ Sí | Depende |

---

## Migración desde Port Forwarding

Si ya tenías configurado port forwarding y quieres cambiar a Firebase:

1. ✅ La web app soporta **ambos modos simultáneamente**
2. ✅ Puedes cambiar entre modos con un click
3. ✅ Configuración se guarda en localStorage
4. ✅ Si estás en casa, usa modo local (más rápido)
5. ✅ Si estás fuera, usa modo Firebase

---

## Soporte y Recursos

- **Documentación Firebase**: https://firebase.google.com/docs/database
- **Librería Arduino**: https://github.com/mobizt/Firebase-ESP-Client
- **Documentación WLED**: https://kno.wled.ge
- **Firebase Console**: https://console.firebase.google.com

---

## Próximos Pasos

1. ✅ Crea tu proyecto en Firebase (10 minutos)
2. ✅ Configura la web app con tu firebaseConfig
3. ✅ Sube el código al ESP
4. ✅ ¡Controla tus LEDs desde cualquier lugar!

---

## Alternativas (Si Firebase no te convence)

### 1. Supabase (Similar a Firebase)
- Base de datos PostgreSQL en tiempo real
- Plan gratuito generoso
- Más control que Firebase

### 2. PubNub
- Especialmente diseñado para IoT
- Plan gratuito limitado
- Latencia muy baja

### 3. AWS IoT Core
- Más complejo de configurar
- Muy escalable
- Plan gratuito el primer año

### 4. Pedir acceso al router a tu ISP
- Muchos ISP te dan acceso si lo pides
- Llama al servicio técnico
- Explica que necesitas "configurar port forwarding para un proyecto IoT"

---

¿Listo para empezar? ¡Sigue el **Paso 1** y tendrás tu sistema funcionando en 30 minutos!
