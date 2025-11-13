# WLED Christmas Tree Scheduler - Servicio Autónomo

Este servicio se ejecuta 24/7 en un servidor y gestiona los horarios del árbol de Navidad WLED automáticamente, **sin necesidad de tener la página web abierta**.

## 🎯 Características

- ✅ Se ejecuta independientemente del navegador
- ✅ Lee horarios desde MQTT topic retenido
- ✅ Soporta zona horaria de República Dominicana
- ✅ Verifica cada 20 segundos
- ✅ Se reconecta automáticamente si pierde conexión
- ✅ Logs detallados con timestamps
- ✅ Soporta horarios overnight (que cruzan medianoche)

## 📋 Requisitos

- Node.js 14+ **O** Docker
- Acceso al broker MQTT (mqtt.vittence.com)
- Los horarios deben estar configurados desde la página web

## 🚀 Métodos de Instalación

### Opción 1: Docker (Recomendado - Más Fácil)

**Ventajas**: No necesitas instalar Node.js, se ejecuta aislado, fácil de mantener

```bash
# 1. Navegar al directorio
cd scheduler-service

# 2. Construir y ejecutar con docker-compose
docker-compose up -d

# 3. Ver logs
docker-compose logs -f

# 4. Detener
docker-compose down

# 5. Reiniciar
docker-compose restart
```

### Opción 2: PM2 (Para servidores Linux/VPS)

**Ventajas**: Se ejecuta como servicio del sistema, se reinicia automáticamente

```bash
# 1. Instalar dependencias
cd scheduler-service
npm install

# 2. Instalar PM2 globalmente
npm install -g pm2

# 3. Iniciar servicio
npm run pm2:start

# 4. Ver logs
npm run pm2:logs

# 5. Configurar para iniciar al bootear el servidor
npm run pm2:startup

# 6. Guardar configuración
pm2 save
```

### Opción 3: Node.js Directo (Para desarrollo/pruebas)

```bash
# 1. Instalar dependencias
cd scheduler-service
npm install

# 2. Ejecutar
npm start

# O en modo desarrollo con auto-reload
npm run dev
```

### Opción 4: Systemd Service (Linux nativo)

```bash
# 1. Instalar dependencias
cd scheduler-service
npm install

# 2. Crear archivo de servicio
sudo nano /etc/systemd/system/wled-scheduler.service
```

Pega este contenido (ajusta las rutas):
```ini
[Unit]
Description=WLED Christmas Tree Scheduler
After=network.target

[Service]
Type=simple
User=tu_usuario
WorkingDirectory=/ruta/completa/a/ChristmasTree/scheduler-service
ExecStart=/usr/bin/node scheduler.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=TZ=America/Santo_Domingo

[Install]
WantedBy=multi-user.target
```

```bash
# 3. Habilitar y arrancar
sudo systemctl enable wled-scheduler
sudo systemctl start wled-scheduler

# 4. Ver logs
sudo journalctl -u wled-scheduler -f

# 5. Ver estado
sudo systemctl status wled-scheduler
```

## 🔧 Configuración

### Configurar Zona Horaria

Edita `scheduler.js` línea 22:

```javascript
timezone: 'America/Santo_Domingo',  // Cambia aquí
```

### Configurar Intervalo de Verificación

Edita `scheduler.js` línea 21:

```javascript
checkInterval: 20000,  // 20 segundos (puedes cambiar)
```

### Configurar Brillo por Defecto

Edita `scheduler.js` línea 23:

```javascript
defaultBrightness: 128  // 0-255
```

## 📊 Verificar que Funciona

Una vez iniciado, deberías ver logs como:

```
[13/01/2025 10:30:00] ℹ️  ==========================================
[13/01/2025 10:30:00] ℹ️  WLED Christmas Tree Scheduler v1.0
[13/01/2025 10:30:00] ℹ️  ==========================================
[13/01/2025 10:30:00] ℹ️  Zona horaria: America/Santo_Domingo
[13/01/2025 10:30:00] ℹ️  Intervalo de verificación: 20s
[13/01/2025 10:30:01] ✅ Conectado exitosamente a MQTT
[13/01/2025 10:30:01] ✅ Suscrito a topic de horarios
[13/01/2025 10:30:01] ℹ️  Horarios actualizados: 2 horarios, Enabled: true, Timezone: America/Santo_Domingo
[13/01/2025 10:30:05] ℹ️  Estado inicial del scheduler: Fuera de horario
```

Cuando llegue la hora programada:
```
[13/01/2025 18:00:15] ⏰ Horario activo (18:00-23:00) - Encendiendo LEDs
[13/01/2025 18:00:15] ✅ Comando enviado: {"on":true,"bri":128}
```

## 🌐 Dónde Ejecutarlo

### Opción 1: VPS/Servidor Cloud (Recomendado)

**Servicios sugeridos** (con capa gratuita):
- **Railway.app** (Fácil, con Docker)
- **Render.com** (Gratis, con Docker)
- **Fly.io** (Gratis hasta cierto uso)
- **DigitalOcean** ($5/mes, muy confiable)
- **Linode/Akamai** ($5/mes)

### Opción 2: Raspberry Pi en tu Casa

Si tienes un Raspberry Pi:
```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar repo y ejecutar
cd /home/pi
git clone <tu-repo>
cd ChristmasTree/scheduler-service
npm install
npm run pm2:start
```

### Opción 3: Tu Computadora (No recomendado para 24/7)

Funciona pero tu PC debe estar encendida 24/7

## 🔍 Troubleshooting

### El servicio no se conecta a MQTT

**Solución**:
1. Verifica que `mqtt.vittence.com:8084` sea accesible desde tu servidor
2. Comprueba logs: `docker-compose logs -f` o `pm2 logs`
3. Verifica que el broker MQTT esté corriendo

### Los horarios no se actualizan

**Problema**: El servicio no recibe los horarios desde MQTT

**Solución**:
1. Verifica en la web que los horarios se guarden correctamente
2. Reinicia el servicio: `docker-compose restart` o `pm2 restart wled-scheduler`
3. Los horarios se publican con `retain: true` en MQTT, así que deberían recibirse al conectar

### El servicio se ejecuta pero no enciende/apaga

**Problemas posibles**:
1. **Horarios deshabilitados**: Verifica que el checkbox "Activar Programación Automática" esté marcado en la web
2. **Zona horaria incorrecta**: Verifica logs, debe mostrar la hora de RD
3. **Días no seleccionados**: Verifica que los días de la semana estén seleccionados en el horario

**Debug**:
```bash
# Ver logs en tiempo real
docker-compose logs -f
# o
pm2 logs wled-scheduler --lines 100
```

### Verificar estado actual

```bash
# Docker
docker ps | grep wled-scheduler

# PM2
pm2 status

# Systemd
sudo systemctl status wled-scheduler
```

## 🛑 Detener el Servicio

```bash
# Docker
docker-compose down

# PM2
pm2 stop wled-scheduler

# Systemd
sudo systemctl stop wled-scheduler
```

## 📝 Logs

### Docker
```bash
docker-compose logs -f
docker-compose logs --tail 100
```

### PM2
```bash
pm2 logs wled-scheduler
pm2 logs wled-scheduler --lines 200
```

### Systemd
```bash
sudo journalctl -u wled-scheduler -f
sudo journalctl -u wled-scheduler --since "1 hour ago"
```

## 🔄 Actualizar el Servicio

```bash
# 1. Pull cambios
git pull

# 2. Reconstruir (Docker)
docker-compose down
docker-compose build
docker-compose up -d

# 2. Reiniciar (PM2)
npm run pm2:restart

# 2. Reiniciar (Systemd)
sudo systemctl restart wled-scheduler
```

## 🆘 Soporte

Si tienes problemas:

1. **Revisa los logs**: Casi siempre tienen la respuesta
2. **Verifica conexión MQTT**: `telnet mqtt.vittence.com 8084`
3. **Verifica horarios en web**: Asegúrate de que estén guardados
4. **Reinicia el servicio**: A veces es todo lo que necesitas

## 📄 Licencia

MIT
