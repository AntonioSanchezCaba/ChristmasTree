# Mosquitto MQTT Broker con SSL/TLS

Guía completa de instalación y configuración de Mosquitto MQTT Broker con soporte SSL/TLS en VPS Ubuntu/Debian.

[![MQTT](https://img.shields.io/badge/MQTT-3.1.1-blue.svg)](https://mqtt.org/)
[![Mosquitto](https://img.shields.io/badge/Mosquitto-2.x-green.svg)](https://mosquitto.org/)
[![SSL](https://img.shields.io/badge/SSL-Let's%20Encrypt-orange.svg)](https://letsencrypt.org/)

## 📑 Tabla de Contenidos

- [Prerrequisitos](#-prerrequisitos)
- [Instalación](#-instalación)
- [Configuración DNS](#-configuración-dns)
- [Certificado SSL](#-certificado-ssl)
- [Configuración de Mosquitto](#️-configuración-de-mosquitto)
- [Firewall](#-configuración-del-firewall)
- [Verificación](#-verificación)
- [Renovación Automática](#-renovación-automática-de-certificados)
- [Integración con WLED](#-integración-con-wled)
- [Troubleshooting](#-troubleshooting)

---

## 📋 Prerrequisitos

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

## ✨ Créditos

Configurado y documentado para proyecto de árbol de Navidad LED con control MQTT.

**Versión:** 1.0.0  
**Última actualización:** Diciembre 2024
