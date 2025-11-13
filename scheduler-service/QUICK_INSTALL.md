# Instalación Automática en VPS (1 Comando)

## 🚀 Instalación Ultra Rápida

**Solo necesitas ejecutar ESTE comando en tu VPS:**

```bash
curl -fsSL https://raw.githubusercontent.com/AntonioSanchezCaba/ChristmasTree/main/scheduler-service/install.sh | sudo bash
```

**Eso es todo.** El script automáticamente:
- ✅ Instala Node.js (si no lo tienes)
- ✅ Instala PM2 (para correr 24/7)
- ✅ Descarga el código del scheduler
- ✅ Instala dependencias
- ✅ Inicia el servicio
- ✅ Configura auto-inicio al bootear

## ⏱️ Tiempo: 2-3 minutos

Una vez ejecutado, el servicio estará corriendo 24/7 automáticamente.

## ✅ Verificar que Funciona

Después de la instalación, el script mostrará los logs automáticamente.

Deberías ver algo como:
```
[13/01/2025 10:30:00] ℹ️  WLED Christmas Tree Scheduler v1.0
[13/01/2025 10:30:01] ✅ Conectado exitosamente a MQTT
[13/01/2025 10:30:01] ✅ Suscrito a topic de horarios
```

Si no ves los logs, ejecuta:
```bash
pm2 logs wled-scheduler
```

## 🧪 Probar que Funciona

1. **Ir a tu página web**
2. **Crear un horario de prueba** (que empiece en 2-3 minutos)
3. **Activar "Activar Programación Automática"**
4. **Cerrar el navegador**
5. **En tu VPS, ver logs:** `pm2 logs wled-scheduler`

Cuando llegue la hora, verás:
```
⏰ Horario activo (18:00-23:00) - Encendiendo LEDs
✅ Comando enviado: {"on":true,"bri":128}
```

## 📝 Comandos Útiles

```bash
# Ver logs en tiempo real
pm2 logs wled-scheduler

# Ver estado
pm2 status

# Reiniciar servicio
pm2 restart wled-scheduler

# Detener servicio
pm2 stop wled-scheduler

# Iniciar servicio (si lo detuviste)
pm2 start wled-scheduler
```

## 🔄 Actualizar el Servicio

Si hago cambios en el código, actualiza así:

```bash
# Detener servicio
pm2 stop wled-scheduler

# Actualizar archivos
cd /opt/wled-scheduler
sudo curl -fsSL https://raw.githubusercontent.com/AntonioSanchezCaba/ChristmasTree/main/scheduler-service/scheduler.js -o scheduler.js

# Reiniciar servicio
pm2 restart wled-scheduler
```

## 🗑️ Desinstalar

Si quieres quitar el servicio:

```bash
pm2 delete wled-scheduler
pm2 save
sudo rm -rf /opt/wled-scheduler
```

## ⚙️ Configuración (Opcional)

Si necesitas cambiar algo (zona horaria, intervalo, etc.):

```bash
sudo nano /opt/wled-scheduler/scheduler.js
```

Edita las líneas:
- Línea 22: `timezone: 'America/Santo_Domingo'`
- Línea 21: `checkInterval: 20000` (20 segundos)
- Línea 23: `defaultBrightness: 128` (0-255)

Después de editar:
```bash
pm2 restart wled-scheduler
```

## 🔐 Si tu Mosquitto Usa Autenticación

Si configuraste usuario/contraseña en Mosquitto:

```bash
sudo nano /opt/wled-scheduler/scheduler.js
```

Busca la línea ~30 y agrega:
```javascript
const options = {
    // ... otras opciones ...
    username: 'tu_usuario_mqtt',  // Agregar
    password: 'tu_password_mqtt'   // Agregar
};
```

Guarda y reinicia:
```bash
pm2 restart wled-scheduler
```

## ❓ Troubleshooting

### No se conecta a MQTT

```bash
# Ver logs de error
pm2 logs wled-scheduler --err

# Verificar que Mosquitto esté corriendo
sudo systemctl status mosquitto

# Verificar puerto
sudo netstat -tuln | grep 8084
```

### Los horarios no se actualizan

```bash
# Reiniciar servicio
pm2 restart wled-scheduler

# Ver logs completos
pm2 logs wled-scheduler --lines 100
```

---

**¿Problemas?** Ejecuta `pm2 logs wled-scheduler` y busca mensajes de error en rojo.
