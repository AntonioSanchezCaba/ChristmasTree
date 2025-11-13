# Instalación Rápida en tu VPS (Ya tienes Mosquitto)

Ya tienes Mosquitto corriendo en tu VPS, así que solo necesitas agregar el scheduler service.

## 🚀 Pasos de Instalación (5-10 minutos)

### 1. Conectar a tu VPS

```bash
ssh tu_usuario@tu_vps_ip
```

### 2. Instalar Node.js (si no lo tienes)

```bash
# Verificar si ya tienes Node.js
node --version

# Si no tienes Node.js, instalarlo:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version  # Debe mostrar v18.x.x
npm --version
```

### 3. Clonar el Repositorio

```bash
# Navegar a un directorio de trabajo (elige el que prefieras)
cd /opt  # o /home/tu_usuario

# Clonar el repo
sudo git clone https://github.com/AntonioSanchezCaba/ChristmasTree.git

# Dar permisos si usaste /opt
sudo chown -R $USER:$USER ChristmasTree

# Entrar al directorio del servicio
cd ChristmasTree/scheduler-service
```

### 4. Instalar Dependencias

```bash
npm install
```

Esto instala solo la librería `mqtt`, que es todo lo que necesita.

### 5. Instalar PM2 (Para que corra 24/7)

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Verificar instalación
pm2 --version
```

### 6. Iniciar el Servicio

```bash
# Iniciar con PM2
pm2 start scheduler.js --name wled-scheduler

# Ver logs en tiempo real
pm2 logs wled-scheduler
```

Debes ver algo como:
```
[13/01/2025 10:30:00] ℹ️  WLED Christmas Tree Scheduler v1.0
[13/01/2025 10:30:01] ✅ Conectado exitosamente a MQTT
[13/01/2025 10:30:01] ✅ Suscrito a topic de horarios
```

### 7. Configurar para que Inicie Automáticamente al Bootear

```bash
# Configurar PM2 para iniciar al boot
pm2 startup

# Esto mostrará un comando que debes ejecutar, algo como:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u tu_usuario --hp /home/tu_usuario
# COPIA Y EJECUTA ese comando exacto

# Guardar la configuración actual
pm2 save
```

### 8. Verificar que Funciona

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs wled-scheduler --lines 50

# Ver información detallada
pm2 info wled-scheduler
```

## ✅ ¡Listo! Ya está corriendo 24/7

Ahora:
1. Ve a tu página web
2. Configura un horario de prueba (que empiece en 2-3 minutos)
3. Activa "Activar Programación Automática"
4. Cierra el navegador
5. En 2-3 minutos, verifica los logs: `pm2 logs wled-scheduler`
6. Debes ver: `⏰ Horario activo - Encendiendo LEDs`

## 🔧 Comandos Útiles

```bash
# Ver logs en tiempo real
pm2 logs wled-scheduler

# Ver estado
pm2 status

# Reiniciar servicio
pm2 restart wled-scheduler

# Detener servicio
pm2 stop wled-scheduler

# Ver logs históricos (últimas 100 líneas)
pm2 logs wled-scheduler --lines 100

# Ver errores
pm2 logs wled-scheduler --err

# Monitorear recursos (CPU, memoria)
pm2 monit
```

## 🔄 Actualizar el Servicio (cuando hagas cambios)

```bash
cd /opt/ChristmasTree  # o donde lo clonaste
git pull
cd scheduler-service
npm install  # por si hay nuevas dependencias
pm2 restart wled-scheduler
```

## ⚙️ Configuración (Opcional)

Si necesitas cambiar algo, edita `scheduler.js`:

```bash
nano /opt/ChristmasTree/scheduler-service/scheduler.js
```

**Líneas importantes**:
- Línea 16: `broker: 'wss://mqtt.vittence.com:8084/mqtt'` ← Tu broker MQTT
- Línea 22: `timezone: 'America/Santo_Domingo'` ← Tu zona horaria
- Línea 21: `checkInterval: 20000` ← Cada cuántos ms verifica (20000 = 20s)
- Línea 23: `defaultBrightness: 128` ← Brillo por defecto (0-255)

Después de editar:
```bash
pm2 restart wled-scheduler
```

## 🔍 Troubleshooting

### El servicio no se conecta a MQTT

```bash
# Ver logs de error
pm2 logs wled-scheduler --err

# Verificar que Mosquitto esté corriendo
sudo systemctl status mosquitto

# Verificar puerto 8084
sudo netstat -tuln | grep 8084
```

### Los horarios no se actualizan

```bash
# Reiniciar servicio
pm2 restart wled-scheduler

# Ver logs completos
pm2 logs wled-scheduler --lines 200
```

### Ver uso de recursos

```bash
pm2 monit
```

## 🗑️ Desinstalar (si lo necesitas)

```bash
pm2 stop wled-scheduler
pm2 delete wled-scheduler
pm2 save

cd /opt
sudo rm -rf ChristmasTree
```

## 📊 Verificar Configuración de Mosquitto

Si usas autenticación en Mosquitto, asegúrate de que el scheduler pueda conectarse:

```bash
# Ver configuración de Mosquitto
cat /etc/mosquitto/mosquitto.conf

# Si tienes usuario/contraseña, necesitas editarlo en scheduler.js
nano /opt/ChristmasTree/scheduler-service/scheduler.js
```

Busca línea ~30 y agrega:
```javascript
const options = {
    clientId: CONFIG.mqtt.clientId,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
    protocol: 'wss',
    rejectUnauthorized: true,
    keepalive: 60,
    username: 'tu_usuario_mqtt',  // ← Agregar si usas auth
    password: 'tu_password_mqtt'   // ← Agregar si usas auth
};
```

Luego reinicia:
```bash
pm2 restart wled-scheduler
```

---

**Eso es todo**. En 5-10 minutos debería estar funcionando perfectamente en tu VPS.
