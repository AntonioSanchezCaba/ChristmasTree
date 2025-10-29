# ChristmasTree LED Controller con WLED

Aplicación web interactiva 3D para controlar luces LED de un árbol de Navidad con WLED, **con acceso remoto sin necesidad de configurar el router**.

## Características

- ✨ Interfaz 3D interactiva del árbol de Navidad
- 🎨 Control de color LED en tiempo real
- 💡 Control de brillo
- 🌐 **Acceso remoto sin port forwarding** (usando Firebase)
- 🔄 Detección automática de red (local vs remota)
- 📱 Funciona desde cualquier dispositivo (PC, móvil, tablet)
- 🎯 Múltiples modos de conexión (HTTP, Firebase, MQTT)

## Soluciones de Acceso Remoto

Este proyecto ofrece **3 soluciones** para controlar tu árbol desde cualquier lugar:

### 1. 🔥 Firebase Cloud (RECOMENDADO si no tienes acceso al router)

**Ideal para**: Personas que no tienen acceso a la configuración de su router.

- ✅ No requiere port forwarding
- ✅ No requiere acceso al router
- ✅ No requiere MQTT
- ✅ No requiere dispositivo intermedio
- ✅ Funciona detrás de cualquier firewall/NAT
- ✅ Plan gratuito de Firebase (generoso)
- ⚠️ Latencia: 1-3 segundos

**Cómo funciona:**
```
Web → Firebase Cloud ← ESP con WLED
     (Base de datos)
```

**Ver:** [FIREBASE_SETUP.md](FIREBASE_SETUP.md) para configuración completa

---

### 2. 🏠 Port Forwarding + DDNS (RECOMENDADO si tienes acceso al router)

**Ideal para**: Personas que pueden configurar su router.

- ✅ Latencia mínima (<100ms)
- ✅ Conexión directa al ESP
- ✅ No requiere MQTT
- ✅ No requiere dispositivo intermedio
- ⚠️ Requiere acceso al router
- ⚠️ Requiere configurar port forwarding y DDNS

**Cómo funciona:**
```
Internet → Tu Dominio (DDNS) → Router (Port Forward) → ESP con WLED
```

**Ver:** [SETUP_REMOTO.md](SETUP_REMOTO.md) para configuración completa

---

### 3. 📡 MQTT

**Ideal para**: Usuarios avanzados que ya tienen broker MQTT.

- ✅ Latencia baja (<500ms)
- ✅ Protocolo estándar IoT
- ⚠️ Requiere broker MQTT (dispositivo siempre encendido o servicio cloud)
- ⚠️ Más complejo de configurar

**Ver:** Código incluido en `index.html`

---

## Comparación de Soluciones

| Característica | Firebase | Port Forwarding | MQTT |
|---------------|----------|-----------------|------|
| **Acceso al router** | ❌ No | ✅ Sí | ❌ No |
| **Latencia** | 1-3s | <100ms | <500ms |
| **Dispositivo intermedio** | ❌ No | ❌ No | ✅ Sí |
| **Complejidad** | ⭐⭐ Media | ⭐⭐⭐ Alta | ⭐⭐⭐ Alta |
| **Coste** | 💰 Gratis* | 💰 Gratis | 💰 Gratis/Pago |
| **Fiabilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

\* Firebase tiene plan gratuito para uso personal

---

## Inicio Rápido

### Opción A: Con Firebase (Sin acceso al router)

#### Paso 1: Configurar Firebase (10 minutos)

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un nuevo proyecto
3. Habilita Realtime Database
4. Copia tu configuración de Firebase
5. Edita `index.html` y pega tu configuración en `firebaseConfig`

#### Paso 2: Configurar el ESP (5 minutos)

1. Instala librería: `Firebase Arduino Client Library for ESP8266 and ESP32`
2. Abre `scripts/ESP_Firebase_WLED.ino`
3. Configura:
   - `WIFI_SSID` y `WIFI_PASSWORD`
   - `FIREBASE_HOST` (tu database URL sin https://)
   - `WLED_IP` (IP de tu ESP con WLED)
4. Sube el código al ESP

#### Paso 3: Usar la aplicación

1. Abre `index.html` en tu navegador
2. Selecciona modo **"Firebase Cloud"**
3. Click en **"Probar y Sincronizar"**
4. ¡Controla tus LEDs desde cualquier lugar!

**Ver guía completa:** [FIREBASE_SETUP.md](FIREBASE_SETUP.md)

---

### Opción B: Con Port Forwarding (Con acceso al router)

#### Paso 1: Configurar Router (15 minutos)

1. Asigna IP estática al ESP: `192.168.1.100`
2. Configura Port Forwarding:
   - Puerto externo: `8080`
   - Puerto interno: `80`
   - IP: `192.168.1.100`

#### Paso 2: Configurar DDNS (10 minutos)

1. Crea cuenta en [DuckDNS](https://www.duckdns.org)
2. Crea subdominio: `mi-arbol-navidad.duckdns.org`
3. Ejecuta script de actualización:
   - Windows: `scripts/actualizar-ddns.ps1`
   - Linux/Mac: `scripts/actualizar-ddns.sh`

#### Paso 3: Configurar aplicación

1. Abre `index.html` en tu navegador
2. Selecciona modo **"HTTP Auto"**
3. Configura:
   - IP Local: `192.168.1.100`
   - Dominio Remoto: `mi-arbol-navidad.duckdns.org:8080`
4. Click en **"Probar y Sincronizar"**

**Ver guía completa:** [SETUP_REMOTO.md](SETUP_REMOTO.md)

---

## Modos de Conexión

La aplicación soporta 5 modos de conexión:

### 1. HTTP Directo
Conexión directa por IP o dominio. Ideal para uso en red local.

### 2. HTTP Auto
Detecta automáticamente si estás en red local o remota y usa la conexión apropiada.

### 3. 🔥 Firebase Cloud ⭐ NUEVO
Conexión vía Firebase Realtime Database. **No requiere acceso al router**.

### 4. MQTT Público
Usa broker público test.mosquitto.org (solo para pruebas).

### 5. MQTT HiveMQ
Usa cluster HiveMQ configurado (requiere credenciales).

---

## Estructura del Proyecto

```
ChristmasTree/
├── index.html                      # Aplicación web principal
├── README.md                       # Este archivo
├── FIREBASE_SETUP.md              # Guía de configuración Firebase
├── SETUP_REMOTO.md                # Guía de Port Forwarding + DDNS
└── scripts/
    ├── ESP_Firebase_WLED.ino      # Código ESP para Firebase
    ├── ESP_DDNS_Update.ino        # Código ESP para actualizar DDNS
    ├── actualizar-ddns.sh         # Script DDNS para Linux/Mac
    ├── actualizar-ddns.ps1        # Script DDNS para Windows
    └── README.md                   # Documentación de scripts
```

---

## Requisitos

### Hardware
- ESP32 o ESP8266 con WLED instalado
- Tira de LEDs RGB/RGBW (WS2812B, SK6812, etc.)
- Fuente de alimentación adecuada (5V, mínimo 2A)

### Software
- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- WLED instalado en el ESP ([wled.me](https://wled.me))

### Opcional (para Firebase)
- Segundo ESP32/ESP8266 para puente Firebase
- O modificar código de WLED para integrar Firebase

### Opcional (para Port Forwarding)
- Acceso de administrador al router
- Ordenador con Windows, Linux o Mac para ejecutar script DDNS

---

## Características Técnicas

### Interfaz Web
- Framework: Vanilla JavaScript + Three.js
- Rendering 3D: Three.js r128
- Comunicación: HTTP, Firebase Realtime Database, MQTT
- Storage: localStorage para configuración

### Modos de Control
- **Paint Mode**: Click en LEDs individuales para cambiar color
- **Brillo Global**: Control de brillo de 0-255
- **Tests de Color**: Pruebas de rojo, verde, azul y ciclo RGB
- **Reset**: Apagar todos los LEDs

### Firebase
- Base de datos en tiempo real
- Polling cada 1-2 segundos
- Estructura de datos optimizada
- Soporte para múltiples dispositivos

### Seguridad
- Reglas de Firebase configurables
- Contraseñas en WLED opcionales
- Port forwarding en puerto no estándar
- Sin exposición de credenciales en código

---

## Solución de Problemas

### Firebase no conecta

**Síntomas:** Error "Firebase connection failed"

**Soluciones:**
1. Verifica que `firebaseConfig` esté correctamente configurado
2. Verifica que `databaseURL` sea correcto (sin https://)
3. Verifica reglas de Firebase (deben permitir lectura/escritura)
4. Abre la consola del navegador para ver errores detallados

Ver [FIREBASE_SETUP.md](FIREBASE_SETUP.md) para más detalles.

---

### Port Forwarding no funciona

**Síntomas:** Funciona en local pero no desde internet

**Soluciones:**
1. Verifica que el puerto esté abierto: [yougetsignal.com/tools/open-ports](https://www.yougetsignal.com/tools/open-ports/)
2. Verifica que DDNS esté actualizado: `ping mi-arbol.duckdns.org`
3. Verifica que tu router soporte hairpin NAT (o usa desde fuera de la red)
4. Verifica que tu ISP no bloquee puertos

Ver [SETUP_REMOTO.md](SETUP_REMOTO.md) para más detalles.

---

### WLED no responde

**Síntomas:** No se pueden cambiar colores, timeout de conexión

**Soluciones:**
1. Verifica que WLED esté encendido y accesible
2. Verifica la IP del ESP: `ping 192.168.1.100`
3. Accede directamente a WLED: `http://192.168.1.100`
4. Verifica la fuente de alimentación (5V, 2A+)
5. Revisa logs en Monitor Serie del ESP

---

### Latencia alta en Firebase

**Síntomas:** Los comandos tardan >5 segundos

**Soluciones:**
1. Reduce el polling interval en el ESP (mínimo 1000ms)
2. Verifica tu conexión a internet
3. Verifica que el ESP tenga buena señal WiFi
4. Considera usar Port Forwarding en su lugar (latencia <100ms)

---

## Recursos Adicionales

### Documentación
- [Documentación WLED](https://kno.wled.ge)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [DuckDNS](https://www.duckdns.org)
- [Three.js](https://threejs.org)

### Librerías Utilizadas
- [Three.js r128](https://threejs.org)
- [MQTT.js 4.3.7](https://github.com/mqttjs/MQTT.js)
- [Firebase JS SDK 10.7.1](https://firebase.google.com)
- [Firebase Arduino Client](https://github.com/mobizt/Firebase-ESP-Client)

---

## Contribuir

Este es un proyecto open source. Las contribuciones son bienvenidas:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

---

## Preguntas Frecuentes

### ¿Cuántos LEDs soporta?

El código está configurado para 200 LEDs por defecto, pero WLED soporta hasta:
- ESP8266: ~500 LEDs
- ESP32: ~1000+ LEDs

### ¿Funciona con otros tipos de LED?

Sí, WLED soporta:
- WS2812B / NeoPixel
- SK6812 / RGBW
- WS2811
- APA102
- Y muchos más

### ¿Puedo controlar varios árboles?

Sí, usando Firebase con diferentes `Device ID` para cada árbol.

### ¿Necesito dos ESP para Firebase?

**Recomendado:** Sí, uno para WLED y otro para el puente Firebase.
**Alternativa:** Puedes integrar Firebase en WLED (requiere modificar código).

### ¿Firebase es gratuito?

Sí, para uso personal el plan gratuito es suficiente (100 conexiones simultáneas, 10GB/mes).

### ¿Qué pasa si se va internet?

- **Firebase:** No funciona sin internet
- **Port Forwarding:** Funciona en red local incluso sin internet
- **Solución:** Usa modo "HTTP Auto" que detecta red local automáticamente

---

## Soporte

Si tienes problemas:

1. Revisa la documentación específica:
   - Firebase: [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
   - Port Forwarding: [SETUP_REMOTO.md](SETUP_REMOTO.md)
   - Scripts: [scripts/README.md](scripts/README.md)

2. Abre un issue en GitHub con:
   - Descripción del problema
   - Modo de conexión usado (Firebase, Port Forwarding, etc.)
   - Logs de consola del navegador
   - Logs del Monitor Serie del ESP

---

## Agradecimientos

- [WLED Project](https://github.com/Aircoookie/WLED) por el increíble firmware
- [Firebase](https://firebase.google.com) por la infraestructura cloud gratuita
- [DuckDNS](https://www.duckdns.org) por el servicio DDNS gratuito

---

## Changelog

### v2.0 (2025) - Firebase Support
- ✨ Añadido soporte para Firebase Realtime Database
- ✨ Nuevo modo "Firebase Cloud" sin port forwarding
- 📖 Documentación completa de Firebase
- 🐛 Correcciones menores

### v1.0 (2024) - Initial Release
- ✨ Interfaz 3D con Three.js
- ✨ Control HTTP directo
- ✨ Modo HTTP Auto con detección de red
- ✨ Soporte MQTT
- 📖 Documentación de Port Forwarding + DDNS

---

**¿Listo para empezar?** Elige tu método de acceso remoto:
- 🔥 **[Configurar Firebase](FIREBASE_SETUP.md)** (sin acceso al router)
- 🏠 **[Configurar Port Forwarding](SETUP_REMOTO.md)** (con acceso al router)
