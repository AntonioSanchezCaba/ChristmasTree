# 🎄 Christmas LED Tree - Sistema de Control IoT

Sistema completo de control para tiras LED WS2812B con visualización 3D, comunicación MQTT y programación automática. Incluye controlador web interactivo (Three.js), broker MQTT con SSL (Mosquitto), scheduler server-side (Node.js) y firmware WLED en ESP8266/ESP32.

[![MQTT](https://img.shields.io/badge/MQTT-3.1.1-blue.svg)](https://mqtt.org/)
[![Mosquitto](https://img.shields.io/badge/Mosquitto-2.x-green.svg)](https://mosquitto.org/)
[![SSL](https://img.shields.io/badge/SSL-Let's%20Encrypt-orange.svg)](https://letsencrypt.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x%20LTS-brightgreen.svg)](https://nodejs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r128-black.svg)](https://threejs.org/)
[![WLED](https://img.shields.io/badge/WLED-0.14+-blueviolet.svg)](https://kno.wled.ge/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📑 Tabla de Contenidos

### Infraestructura MQTT
- [Prerrequisitos](#-prerrequisitos)
- [Instalación de Mosquitto](#-instalación)
- [Configuración DNS](#-configuración-dns)
- [Certificado SSL](#-certificado-ssl)
- [Configuración de Mosquitto](#️-configuración-de-mosquitto)
- [Firewall](#-configuración-del-firewall)
- [Verificación](#-verificación)
- [Renovación Automática](#-renovación-automática-de-certificados)
- [Integración con WLED](#-integración-con-wled)
- [Troubleshooting MQTT](#-troubleshooting)

### Controlador Web y Sistema Completo
- [Controlador Web (index.html)](#-controlador-web-para-wled-indexhtml)
- [Instalación del Sistema Completo](#-instalación-del-sistema-completo)
- [Debugging Avanzado](#-debugging)
- [Estructura del Repositorio](#-estructura-del-repositorio)
- [Actualizaciones Futuras](#-actualizaciones-futuras)

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE WEB                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  index.html (GitHub Pages / Hosting)                     │  │
│  │  - Visualización 3D (Three.js)                           │  │
│  │  - Controles interactivos                                │  │
│  │  - Paint Mode                                            │  │
│  │  - MQTT.js client                                        │  │
│  └────────────────┬─────────────────────────────────────────┘  │
│                   │                                             │
│                   │ WSS/WS                                      │
└───────────────────┼─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VPS (Ubuntu/Debian)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Mosquitto MQTT Broker                                   │  │
│  │  - Puerto 1883 (MQTT)                                    │  │
│  │  - Puerto 8080 (WebSocket)                               │  │
│  │  - Puerto 8084 (WebSocket SSL)                           │  │
│  │  - SSL/TLS (Let's Encrypt)                               │  │
│  └────────┬──────────────────────────────┬──────────────────┘  │
│           │                              │                     │
│           │                              │                     │
│  ┌────────▼──────────────────┐  ┌────────▼──────────────────┐  │
│  │  Node.js Scheduler        │  │  Certificados SSL         │  │
│  │  - systemd service        │  │  - Auto-renovación        │  │
│  │  - Horarios 24/7          │  │  - /etc/letsencrypt/      │  │
│  │  - Zona horaria RD        │  │                           │  │
│  │  - Persistencia JSON      │  │                           │  │
│  └───────────────────────────┘  └───────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ MQTT (sin TLS)
                  │ Puerto 1883
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   RED LOCAL / WiFi                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ESP8266/ESP32 (WLED Firmware)                           │  │
│  │  - Cliente MQTT                                          │  │
│  │  - HTTP API                                              │  │
│  │  - GPIO control                                          │  │
│  └────────────────┬─────────────────────────────────────────┘  │
│                   │                                             │
│                   │ GPIO (Data Pin)                             │
│                   ▼                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WS2812B LED Strip                                       │  │
│  │  - 179 LEDs (configurable)                               │  │
│  │  - Color Order: GRB                                      │  │
│  │  - 5V Power Supply                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

Flujo de Datos:
1. Usuario interactúa con index.html
2. JavaScript envía comandos via MQTT/WebSocket
3. Mosquitto broker recibe y distribuye mensajes
4. Scheduler ejecuta horarios automáticos
5. ESP8266 recibe comandos MQTT
6. WLED firmware controla LEDs físicos
```

### Características del Sistema

✅ **Control en tiempo real** - Cambios instantáneos desde cualquier dispositivo  
✅ **Visualización 3D** - Preview exacto del estado de cada LED  
✅ **Programación automática** - Horarios configurables 24/7  
✅ **Múltiples protocolos** - MQTT, WebSocket, HTTP  
✅ **Seguridad** - SSL/TLS para comunicaciones externas  
✅ **Alta disponibilidad** - Servicios systemd con auto-restart  
✅ **Sin dependencias del navegador** - Scheduler funciona independientemente  
✅ **Escalable** - Soporta múltiples dispositivos WLED simultáneamente

---

## 📋 Prerrequisitos del Sistema Completo

- **VPS** con Ubuntu 20.04+ o Debian 10+
- **Dominio o subdominio** configurado (ejemplo: `mqtt.example.com`)
- **Acceso root/sudo** al servidor
- **Puertos abiertos:** 1883 (MQTT), 8080 (WebSocket), 8084 (WebSocket SSL)

---

## 🔧 Instalación

### 1. Actualizar el sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Mosquitto

```bash
sudo apt install mosquitto mosquitto-clients -y
```

### 3. Verificar instalación

```bash
mosquitto -h
```

Deberías ver la información de ayuda de Mosquitto.

---

## 🌐 Configuración DNS

### Crear registro A en tu proveedor DNS

**Ejemplo con Hostinger, Cloudflare, o cualquier proveedor:**

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | mqtt | `TU_IP_VPS` | 3600 |

**Ejemplo:** Si tu dominio es `example.com` y tu IP es `212.56.34.203`:
- Crear registro A: `mqtt.example.com` → `212.56.34.203`

### Verificar propagación DNS

```bash
ping mqtt.example.com
```

Espera 5-10 minutos si no resuelve inmediatamente.

---

## 🔐 Certificado SSL

### 1. Instalar Certbot

```bash
sudo apt install certbot -y
```

### 2. Obtener certificado SSL

```bash
sudo certbot certonly --standalone -d mqtt.example.com
```

**Sigue las instrucciones:**
- Acepta términos de servicio
- Proporciona email para notificaciones
- El certificado se guardará en: `/etc/letsencrypt/live/mqtt.example.com/`

### 3. Verificar certificados generados

```bash
sudo ls -la /etc/letsencrypt/live/mqtt.example.com/
```

**Archivos importantes:**
- `fullchain.pem` - Certificado completo (cert + chain)
- `chain.pem` - Cadena de certificación
- `privkey.pem` - Clave privada

### 4. Copiar certificados para Mosquitto

```bash
# Crear directorio
sudo mkdir -p /etc/mosquitto/certs

# Copiar certificados
sudo cp /etc/letsencrypt/live/mqtt.example.com/fullchain.pem /etc/mosquitto/certs/
sudo cp /etc/letsencrypt/live/mqtt.example.com/chain.pem /etc/mosquitto/certs/
sudo cp /etc/letsencrypt/live/mqtt.example.com/privkey.pem /etc/mosquitto/certs/

# Asignar permisos
sudo chown mosquitto:mosquitto /etc/mosquitto/certs/*
sudo chmod 644 /etc/mosquitto/certs/fullchain.pem
sudo chmod 644 /etc/mosquitto/certs/chain.pem
sudo chmod 600 /etc/mosquitto/certs/privkey.pem
```

---

## ⚙️ Configuración de Mosquitto

### 1. Crear archivo de configuración

```bash
sudo nano /etc/mosquitto/conf.d/websocket.conf
```

### 2. Agregar configuración

```conf
# Log detallado
log_type all

# MQTT estándar (puerto 1883)
listener 1883
protocol mqtt
allow_anonymous true

# WebSocket sin SSL (puerto 8080 - para pruebas locales)
listener 8080
protocol websockets
allow_anonymous true

# WebSocket con SSL (puerto 8084 - producción)
listener 8084
protocol websockets
allow_anonymous true
cafile /etc/mosquitto/certs/chain.pem
certfile /etc/mosquitto/certs/fullchain.pem
keyfile /etc/mosquitto/certs/privkey.pem
```

**Guardar:** `Ctrl+O`, `Enter`, `Ctrl+X`

### 3. Reiniciar Mosquitto

```bash
# Habilitar inicio automático
sudo systemctl enable mosquitto

# Reiniciar servicio
sudo systemctl restart mosquitto

# Verificar estado
sudo systemctl status mosquitto
```

**Salida esperada:**
```
● mosquitto.service - Mosquitto MQTT Broker
     Loaded: loaded
     Active: active (running)
```

### 4. Verificar puertos abiertos

```bash
sudo ss -tulpn | grep mosquitto
```

**Deberías ver:**
- `*:1883` - MQTT estándar
- `*:8080` - WebSocket sin SSL
- `*:8084` - WebSocket con SSL

---

## 🔥 Configuración del Firewall

### Opción A: UFW (Ubuntu Firewall)

```bash
sudo ufw allow 1883/tcp comment 'MQTT'
sudo ufw allow 8080/tcp comment 'MQTT WebSocket'
sudo ufw allow 8084/tcp comment 'MQTT WebSocket SSL'
sudo ufw reload
sudo ufw status
```

### Opción B: iptables

```bash
sudo iptables -A INPUT -p tcp --dport 1883 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8084 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

---

## ✅ Verificación

### 1. Ver logs de Mosquitto

```bash
sudo tail -f /var/log/mosquitto/mosquitto.log
```

### 2. Probar desde el servidor

**Terminal 1 - Suscriptor:**
```bash
mosquitto_sub -h localhost -t test/topic
```

**Terminal 2 - Publicador:**
```bash
mosquitto_pub -h localhost -t test/topic -m "Hello MQTT"
```

Deberías ver el mensaje "Hello MQTT" en Terminal 1.

### 3. Probar desde cliente externo

**Sin SSL (puerto 1883):**
```bash
mosquitto_sub -h mqtt.example.com -p 1883 -t test/topic
```

**Con SSL (puerto 8084):**
```bash
mosquitto_sub -h mqtt.example.com -p 8084 -t test/topic --capath /etc/ssl/certs/
```

### 4. Probar WebSocket desde navegador

Abre la consola del navegador (`F12`) y prueba:

```javascript
// WebSocket sin SSL (solo funciona en sitios HTTP)
const client = new Paho.MQTT.Client("ws://mqtt.example.com:8080/mqtt", "clientId");

// WebSocket con SSL (funciona en sitios HTTPS)
const client = new Paho.MQTT.Client("wss://mqtt.example.com:8084/mqtt", "clientId");
```

---

## 🔄 Renovación Automática de Certificados

Let's Encrypt emite certificados válidos por 90 días. Certbot incluye renovación automática, pero debemos recargar Mosquitto.

### 1. Crear script de post-renovación

```bash
sudo nano /etc/letsencrypt/renewal-hooks/deploy/mosquitto-reload.sh
```

**Contenido:**

```bash
#!/bin/bash
# Post-renewal script para Mosquitto
# Se ejecuta automáticamente después de renovar certificados

# Copiar nuevos certificados
cp /etc/letsencrypt/live/mqtt.example.com/fullchain.pem /etc/mosquitto/certs/
cp /etc/letsencrypt/live/mqtt.example.com/chain.pem /etc/mosquitto/certs/
cp /etc/letsencrypt/live/mqtt.example.com/privkey.pem /etc/mosquitto/certs/

# Asignar permisos
chown mosquitto:mosquitto /etc/mosquitto/certs/*
chmod 644 /etc/mosquitto/certs/fullchain.pem
chmod 644 /etc/mosquitto/certs/chain.pem
chmod 600 /etc/mosquitto/certs/privkey.pem

# Recargar Mosquitto (sin interrumpir conexiones)
systemctl reload mosquitto

# Log
echo "$(date): Certificados renovados y Mosquitto recargado" >> /var/log/mosquitto/cert-renewal.log
```

### 2. Dar permisos de ejecución

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/mosquitto-reload.sh
```

### 3. Probar renovación (dry-run)

```bash
sudo certbot renew --dry-run
```

Si todo está bien, verás: `Congratulations, all simulated renewals succeeded`

### 4. Verificar cron de renovación

Certbot instala automáticamente un timer systemd:

```bash
sudo systemctl status certbot.timer
```

---

## 🎄 Integración con WLED

### Configuración en WLED

1. Accede a la interfaz web de WLED (`http://IP_WLED`)
2. Ve a **Settings** → **Sync Interfaces** → **MQTT**
3. Configura:

| Parámetro | Valor |
|-----------|-------|
| **Enable MQTT** | ✅ Activado |
| **Broker** | `mqtt.example.com` |
| **Port** | `1883` |
| **Username** | (vacío si `allow_anonymous true`) |
| **Password** | (vacío si `allow_anonymous true`) |
| **Client ID** | `wled-tree` (o cualquier identificador único) |
| **Device Topic** | `wled/tree` |
| **Group Topic** | `wled/all` (opcional) |

4. Guarda y reinicia WLED

### Topics MQTT de WLED

**Publicar (desde cliente a WLED):**
- `wled/tree/api` - Enviar comandos JSON API
- `wled/tree/col` - Cambiar color (formato: `RRGGBB` o `#RRGGBB`)
- `wled/tree/col2` - Color secundario
- `wled/tree/brightness` - Brillo (0-255)

**Suscribirse (desde WLED al broker):**
- `wled/tree/v` - Estado actual en JSON
- `wled/tree/status` - Estado de conexión

### Ejemplo: Controlar WLED vía MQTT

```bash
# Encender LEDs en rojo
mosquitto_pub -h mqtt.example.com -t wled/tree/col -m "FF0000"

# Cambiar brillo al 50%
mosquitto_pub -h mqtt.example.com -t wled/tree/brightness -m "128"

# Enviar comando JSON completo
mosquitto_pub -h mqtt.example.com -t wled/tree/api -m '{"on":true,"bri":255,"seg":[{"col":[[255,0,0]]}]}'
```

---

## 🛠️ Troubleshooting

### Mosquitto no inicia

**Ver error específico:**
```bash
sudo journalctl -xeu mosquitto.service -n 50
sudo tail -n 50 /var/log/mosquitto/mosquitto.log
```

**Probar configuración manualmente:**
```bash
sudo mosquitto -c /etc/mosquitto/mosquitto.conf -v
```

### Error: "Unable to load server certificate"

**Causa:** Permisos incorrectos en certificados

**Solución:**
```bash
sudo chown mosquitto:mosquitto /etc/mosquitto/certs/*
sudo chmod 644 /etc/mosquitto/certs/*.pem
sudo chmod 600 /etc/mosquitto/certs/privkey.pem
```

### Error: "Address already in use"

**Causa:** Otro proceso usando el puerto

**Verificar qué proceso usa el puerto:**
```bash
sudo lsof -i :1883
sudo lsof -i :8080
sudo lsof -i :8084
```

**Detener servicio conflictivo o cambiar puerto en la configuración.**

### No se puede conectar desde navegador

**Problema:** Mixed content (HTTPS → WS)

**Solución:**
- Usar `wss://` (puerto 8084) desde sitios HTTPS
- Usar `ws://` (puerto 8080) solo desde sitios HTTP o archivos locales

**Problema:** CORS o WebSocket bloqueado

**Solución:**
- Verificar firewall del VPS
- Verificar configuración del proveedor de hosting (Cloudflare proxy puede bloquear)

### WLED no se conecta al broker

**Verificar:**
1. IP/dominio correcto en configuración WLED
2. Puerto 1883 abierto y accesible
3. WLED y broker en la misma red o con rutas correctas
4. Logs de Mosquitto: `sudo tail -f /var/log/mosquitto/mosquitto.log`

**Probar conexión desde otro cliente:**
```bash
mosquitto_sub -h mqtt.example.com -p 1883 -t wled/# -v
```

### Certificado SSL no válido en navegador

**Causa:** Usando `cert.pem` en lugar de `fullchain.pem`

**Solución:**
```bash
sudo cp /etc/letsencrypt/live/mqtt.example.com/fullchain.pem /etc/mosquitto/certs/
sudo nano /etc/mosquitto/conf.d/websocket.conf
# Cambiar certfile a: certfile /etc/mosquitto/certs/fullchain.pem
sudo systemctl restart mosquitto
```

---

## 📊 URLs de Conexión

| Protocolo | URL | Puerto | Uso |
|-----------|-----|--------|-----|
| MQTT | `mqtt://mqtt.example.com:1883` | 1883 | Clientes MQTT (WLED, Python, etc.) |
| WebSocket | `ws://mqtt.example.com:8080/mqtt` | 8080 | Navegadores (solo HTTP) |
| WebSocket SSL | `wss://mqtt.example.com:8084/mqtt` | 8084 | Navegadores (HTTPS) |

---

## 📚 Recursos Adicionales

- [Documentación oficial de Mosquitto](https://mosquitto.org/documentation/)
- [MQTT.org - Especificación del protocolo](https://mqtt.org/)
- [Let's Encrypt - Documentación](https://letsencrypt.org/docs/)
- [WLED - MQTT Control](https://kno.wled.ge/interfaces/mqtt/)

---

## 📝 Notas Importantes

### Seguridad

- Esta guía usa `allow_anonymous true` para simplificar. Para producción, considera:
  - Autenticación con usuario/contraseña
  - ACLs (Access Control Lists) para restringir topics
  - Deshabilitar acceso anónimo

### Monitoreo

```bash
# Ver conexiones activas
sudo netstat -tnp | grep mosquitto

# Ver mensajes en tiempo real (todos los topics)
mosquitto_sub -h localhost -t '#' -v

# Ver estadísticas del broker
mosquitto_sub -h localhost -t '$SYS/#' -v
```

### Rendimiento

Para instalaciones con muchos clientes:

```bash
sudo nano /etc/mosquitto/mosquitto.conf
```

Agregar:
```conf
max_connections -1
max_queued_messages 1000
message_size_limit 0
```

---

## 🤝 Contribuciones

Si encuentras errores o mejoras, abre un issue o pull request.

---

## 📄 Licencia

Esta documentación está bajo licencia MIT. Úsala libremente.

---

---

## 🎄 Controlador Web para WLED (index.html)

### Descripción General

El controlador web es una interfaz HTML completa que permite controlar tiras LED WS2812B a través de WLED firmware usando comunicación MQTT. Desarrollado específicamente para un árbol de Navidad con 179 LEDs, incluye visualización 3D interactiva, múltiples modos de control y programación automática de horarios.

### Características Principales

#### 🎨 Visualización 3D
- **Renderizado con Three.js** - Árbol de Navidad 3D con representación exacta de 179 LEDs
- **Rotación automática** - Vista dinámica del árbol con controles de cámara
- **LED interactivos** - Cada LED es clickeable y responde visualmente
- **Paint Mode** - Modo de pintura que permite colorear LEDs individuales con el mouse
- **Sincronización en tiempo real** - Los cambios en la web se reflejan instantáneamente en el hardware físico

#### 🎭 Diseños Estáticos
- **Rainbow** - Arcoíris completo en gradiente
- **Warm White** - Blanco cálido para ambiente acogedor
- **Cold White** - Blanco frío tipo nieve
- **Red/Green** - Colores clásicos de Navidad
- **Dominican** - Tricolor de República Dominicana (Rojo-Blanco-Azul)
- **Custom Colors** - Selector de color libre
- **Guardado de diseños** - Almacenamiento local de patrones personalizados

#### ✨ Efectos Animados
- **Fire** - Simulación realista de fuego
- **Chase** - Luces persiguiéndose en secuencia
- **Twinkle** - Centelleo aleatorio tipo estrellas
- **Wave** - Ondas de color recorriendo el árbol
- **Fade** - Transiciones suaves entre colores

#### ⚙️ Controles
- **Brightness Slider** - Control de brillo de 0-255
- **Color Picker** - Selector de color con preview en tiempo real
- **On/Off Toggle** - Encendido/apagado instantáneo
- **Effect Speed** - Ajuste de velocidad de animaciones

#### ⏰ Programación Automática (Server-Side)
- **Horarios On/Off** - Configuración de encendido y apagado automático
- **Timezone Support** - Zona horaria America/Santo_Domingo
- **Persistencia** - Horarios guardados en servidor, independientes del navegador
- **24/7 Operation** - Funciona sin necesidad de tener la página abierta

#### 🔧 Diagnóstico
- **Color Tests** - Pruebas individuales de rojo, verde y azul
- **RGB Cycle** - Ciclo de colores para verificar funcionamiento
- **MQTT Status** - Monitor de conexión en tiempo real
- **Debug Log** - Registro detallado de eventos MQTT

### Arquitectura Técnica

#### Frontend (index.html)
```
├── HTML5 + CSS3
├── JavaScript Vanilla
├── Three.js r128 (Visualización 3D)
├── MQTT.js 4.3.7 (Comunicación broker)
└── LocalStorage (Persistencia de diseños)
```

#### Backend (Node.js Scheduler)
```
├── Node.js 20.x/24.x LTS
├── mqtt npm package
├── systemd service
└── JSON file storage
```

#### Comunicación
```
Web Interface <--MQTT/WebSocket--> Mosquitto Broker <--MQTT--> WLED (ESP8266/ESP32)
                                         ↓
                                  Node.js Scheduler
                                  (Server-side timing)
```

### Limitaciones y Soluciones

#### Problema: WLED Firmware Limitations
**Limitación:** WLED firmware no soporta TLS/SSL para MQTT, y tiene RAM limitada (80KB en ESP8266) que causa freezes con payloads JSON grandes.

**Solución Implementada:** Comunicación híbrida
- Comandos simples → MQTT (encender/apagar, brillo, color básico)
- Arrays completos de LEDs → HTTP directo a WLED
- WebSocket para sincronización rápida cuando está disponible

#### Problema: Browser Mixed Content Policy
**Limitación:** Navegadores bloquean conexiones WS (sin SSL) desde páginas HTTPS.

**Solución Implementada:**
- Conexión WSS (WebSocket Secure) en puerto 8084 para sitios HTTPS
- Conexión WS (sin SSL) en puerto 8080 para desarrollo local
- Fallback automático a HTTP si WebSocket falla

#### Problema: Scheduling Reliability
**Limitación:** Timers de JavaScript (setTimeout/setInterval) son poco confiables para operación 24/7.

**Solución Implementada:** Node.js Scheduler Service
- Servicio independiente en VPS
- Gestión de horarios mediante systemd
- Verificación cada 60 segundos
- Tolerancia a fallos con reconexión automática

#### Problema: Color Order Mismatch
**Limitación:** Diferentes tiras LED usan diferentes órdenes de color (RGB, GRB, BRG).

**Solución Implementada:**
- Configuración de `COLOR_ORDER` en código
- Funciones de conversión automática
- Tests de diagnóstico por canal individual

---

## 📦 Instalación del Sistema Completo

### Requisitos del Sistema

**Hardware:**
- ESP8266 o ESP32 con WLED firmware
- Tira LED WS2812B (cualquier cantidad de LEDs)
- Fuente de alimentación adecuada (5V, mínimo 3A por cada 60 LEDs)

**Software:**
- VPS con Ubuntu 20.04+ o Debian 10+
- Node.js 20.x o 24.x LTS
- Mosquitto MQTT Broker
- Git (para clonar repositorio)

### Paso 1: Configurar VPS y Mosquitto

Sigue las instrucciones de la sección [Configuración de Mosquitto](#-configuración-de-mosquitto) de este README.

### Paso 2: Instalar Node.js Scheduler

```bash
# 1. Instalar Node.js 24.x LTS
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Verificar instalación
node --version  # v24.x.x
npm --version   # 10.x.x

# 3. Crear directorio del servicio
sudo mkdir -p /opt/wled-scheduler
cd /opt/wled-scheduler

# 4. Crear el script del scheduler
sudo nano wled-scheduler.js
```

**Contenido del archivo `wled-scheduler.js`:**

Ver el archivo completo en: [wled-scheduler.js](./server/wled-scheduler.js)

```bash
# 5. Hacer ejecutable
sudo chmod +x wled-scheduler.js

# 6. Inicializar npm e instalar dependencias
npm init -y
npm install mqtt

# 7. Crear directorio de datos con permisos correctos
sudo mkdir -p /var/lib/wled-scheduler
sudo chown -R nobody:nogroup /var/lib/wled-scheduler
sudo chmod -R 755 /var/lib/wled-scheduler
```

### Paso 3: Configurar Servicio Systemd

```bash
sudo nano /etc/systemd/system/wled-scheduler.service
```

**Contenido:**

```ini
[Unit]
Description=WLED Scheduler Service
After=network.target mosquitto.service
Wants=mosquitto.service

[Service]
Type=simple
User=nobody
Group=nogroup
WorkingDirectory=/opt/wled-scheduler
ExecStart=/usr/bin/node /opt/wled-scheduler/wled-scheduler.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
MemoryLimit=128M
CPUQuota=20%

[Install]
WantedBy=multi-user.target
```

```bash
# Activar y arrancar el servicio
sudo systemctl daemon-reload
sudo systemctl enable wled-scheduler
sudo systemctl start wled-scheduler

# Verificar estado
sudo systemctl status wled-scheduler

# Ver logs en tiempo real
sudo journalctl -u wled-scheduler -f
```

### Paso 4: Configurar WLED

1. Accede a la interfaz web de WLED: `http://IP_DEL_ESP`
2. Ve a **Settings** → **WiFi Setup**
   - Conecta a tu red WiFi
   - Anota la IP asignada
3. Ve a **Settings** → **LED Preferences**
   - **Length:** 179 (o tu cantidad de LEDs)
   - **Color Order:** GRB (ajusta según tu tira)
   - **GPIO:** Según tu conexión (típicamente GPIO2 en ESP8266)
4. Ve a **Settings** → **Sync Interfaces** → **MQTT**
   - **Enable:** ✅
   - **Broker:** `mqtt.example.com` (tu dominio)
   - **Port:** `1883`
   - **Device Topic:** `wled/tree`
   - **Group Topic:** `wled/all` (opcional)
5. **Save & Reboot**

### Paso 5: Desplegar el Controlador Web

#### Opción A: GitHub Pages

```bash
# 1. Clonar tu repositorio
git clone https://github.com/TU_USUARIO/ChristmasTree.git
cd ChristmasTree

# 2. Modificar configuración MQTT en index.html
nano index.html
# Busca la sección MQTT_CONFIG y actualiza:
# broker: 'wss://mqtt.example.com:8084/mqtt'

# 3. Commit y push
git add index.html
git commit -m "Actualizar configuración MQTT"
git push origin main

# 4. Configurar GitHub Pages
# Ve a: Settings → Pages → Source: main branch
# Tu página estará en: https://TU_USUARIO.github.io/ChristmasTree/
```

#### Opción B: Hosting Propio

```bash
# Subir index.html a tu servidor web
scp index.html usuario@tu-servidor:/var/www/html/wled/

# O usar Nginx/Apache para servir el archivo
```

### Paso 6: Prueba del Sistema

1. **Abrir el controlador web:**
   - URL: `https://TU_USUARIO.github.io/ChristmasTree/`
   - Verifica que aparece "✅ Conectado a MQTT"

2. **Probar controles básicos:**
   - Botón On/Off
   - Cambiar brillo
   - Seleccionar un diseño estático (ej: Rainbow)

3. **Verificar sincronización:**
   - Los cambios deben reflejarse en el árbol físico
   - Ver logs: `sudo journalctl -u wled-scheduler -f`

4. **Configurar horarios:**
   - Agregar horario de encendido (ej: 18:00)
   - Agregar horario de apagado (ej: 23:00)
   - Esperar a la hora configurada o cambiar la hora del sistema para probar

---

## 🔍 Debugging

### Ver Logs del Scheduler

```bash
# Logs en tiempo real
sudo journalctl -u wled-scheduler -f

# Últimas 100 líneas
sudo journalctl -u wled-scheduler -n 100

# Filtrar por errores
sudo journalctl -u wled-scheduler -p err
```

### Probar Conexión MQTT desde Línea de Comandos

```bash
# Suscribirse a todos los topics
mosquitto_sub -h mqtt.example.com -p 1883 -t '#' -v

# Publicar comando de prueba
mosquitto_pub -h mqtt.example.com -p 1883 -t wled/tree/api -m '{"on":true,"bri":255}'
```

### Verificar Estado del Scheduler

```bash
# Estado del servicio
sudo systemctl status wled-scheduler

# Ver archivo de horarios guardados
sudo cat /var/lib/wled-scheduler/schedules.json

# Reiniciar servicio si es necesario
sudo systemctl restart wled-scheduler
```

### Problemas Comunes

**El árbol no responde desde la web:**
1. Verifica conexión MQTT: `sudo netstat -tunap | grep 1883`
2. Verifica que WLED esté conectado: `mosquitto_sub -t 'wled/tree/#' -v`
3. Revisa logs de WLED en su interfaz web

**Los horarios no funcionan:**
1. Verifica zona horaria del VPS: `timedatectl`
2. Verifica logs del scheduler: `sudo journalctl -u wled-scheduler -f`
3. Verifica que el archivo existe: `sudo cat /var/lib/wled-scheduler/schedules.json`

**Paint Mode no funciona:**
- Asegúrate de estar usando HTTP directo o tener CORS configurado
- Verifica que la IP de WLED sea accesible desde tu navegador
- Prueba con Ctrl+Click para forzar actualización

---

## 📚 Estructura del Repositorio

```
ChristmasTree/
├── index.html              # Controlador web con visualización 3D
├── server/
│   └── wled-scheduler.js  # Servicio Node.js para horarios
├── docs/
│   ├── mqtt-setup.md      # Configuración detallada de Mosquitto
│   ├── wled-config.md     # Guía de configuración de WLED
│   └── troubleshooting.md # Solución de problemas comunes
└── README.md              # Este archivo
```

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para cambios importantes:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## ⚠️ Notas Importantes

### Seguridad
- Este setup usa `allow_anonymous true` para simplificar el desarrollo
- Para producción, considera implementar autenticación MQTT
- Usa contraseñas fuertes si habilitas auth en Mosquitto
- Mantén tu VPS actualizado: `sudo apt update && sudo apt upgrade`

### Rendimiento
- El scheduler verifica horarios cada 60 segundos (ajustable en `CONFIG.checkInterval`)
- Para más de 500 LEDs, considera aumentar el timeout de HTTP
- Mosquitto puede manejar miles de clientes simultáneos sin problemas

### Mantenimiento
- Los certificados SSL se renuevan automáticamente cada 90 días
- Los logs de systemd rotan automáticamente
- Revisa el espacio en disco periódicamente: `df -h`

---

## ✨ Créditos

Desarrollado por Antonio Sánchez Caba para control de árbol de Navidad LED con tecnología IoT.

**Tecnologías utilizadas:**
- WLED Firmware (Aircoookie)
- Three.js (Visualización 3D)
- Mosquitto MQTT Broker
- Node.js + systemd
- Let's Encrypt SSL

**Repositorio:** [github.com/AntonioSanchezCaba/ChristmasTree](https://github.com/AntonioSanchezCaba/ChristmasTree)

**Versión:** 2.0.0  
**Última actualización:** Diciembre 2025
