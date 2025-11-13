# Guía de Deployment - WLED Christmas Tree

Esta guía te ayudará a configurar el sistema completo para que funcione 24/7 sin necesidad de tener la página web abierta.

## 🎯 Arquitectura del Sistema

```
┌─────────────────┐
│  Página Web     │ ← Configuras horarios desde aquí
│  (Browser)      │
└────────┬────────┘
         │
         ↓ Publica horarios en MQTT
    ┌────────────────────┐
    │  MQTT Broker       │ ← mqtt.vittence.com:8084
    │  (Mosquitto)       │    (siempre activo)
    └─────┬──────────────┘
          │
          ├──→ ┌──────────────────┐
          │    │ Scheduler Service│ ← Script que corre 24/7
          │    │ (Node.js)        │    (maneja horarios)
          │    └──────────────────┘
          │
          └──→ ┌──────────────────┐
               │ ESP32 WLED       │ ← Recibe comandos MQTT
               │ (LEDs físicos)   │
               └──────────────────┘
```

## ✅ Estado Actual vs. Estado Objetivo

### ❌ Estado Actual (Problema)
- Los horarios **solo funcionan cuando la página web está abierta**
- Si cierras el navegador, JavaScript deja de ejecutarse
- Los LEDs no se encienden/apagan automáticamente

### ✅ Estado Objetivo (Solución)
- Scheduler Service corriendo 24/7 en un servidor
- Lee horarios desde MQTT (configurados en la web)
- Enciende/apaga LEDs automáticamente
- La página web solo se usa para configurar, no necesita estar abierta

## 🚀 Opciones de Deployment

### Opción 1: Railway.app (MÁS FÁCIL - Recomendado)

**Ventajas**:
- ✅ Gratis hasta cierto uso
- ✅ Deploy automático desde GitHub
- ✅ Logs integrados
- ✅ HTTPS automático

**Pasos**:

1. **Crear cuenta en Railway**
   - Ve a https://railway.app
   - Regístrate con GitHub

2. **Subir código a GitHub** (si no lo has hecho)
   ```bash
   git add scheduler-service/
   git commit -m "Add scheduler service"
   git push
   ```

3. **Crear proyecto en Railway**
   - Click en "New Project"
   - Selecciona "Deploy from GitHub repo"
   - Selecciona tu repositorio ChristmasTree
   - Railway detectará automáticamente el Dockerfile

4. **Configurar root directory**
   - En Settings → Root Directory: `scheduler-service`

5. **Deploy**
   - Railway automáticamente hará build y deploy
   - Ver logs en la pestaña "Deployments"

6. **Verificar**
   - Los logs deben mostrar: `✅ Conectado exitosamente a MQTT`

### Opción 2: Render.com (También muy fácil)

**Ventajas**:
- ✅ Gratis para servicios que no necesitan HTTP
- ✅ Deploy desde GitHub
- ✅ Fácil configuración

**Pasos**:

1. **Crear cuenta**: https://render.com

2. **New → Background Worker**

3. **Conectar repositorio GitHub**

4. **Configuración**:
   - Name: `wled-scheduler`
   - Root Directory: `scheduler-service`
   - Build Command: `npm install`
   - Start Command: `node scheduler.js`

5. **Deploy** y verificar logs

### Opción 3: DigitalOcean Droplet (Más control, $5/mes)

**Ventajas**:
- ✅ Control total del servidor
- ✅ Muy confiable
- ✅ Puede correr otros servicios también

**Pasos**:

1. **Crear Droplet**
   - Tamaño: Basic ($5/mes)
   - Imagen: Ubuntu 22.04 LTS
   - Datacenter: New York (más cerca de RD)

2. **Conectar por SSH**
   ```bash
   ssh root@tu_droplet_ip
   ```

3. **Instalar Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo apt-get install docker-compose-plugin
   ```

4. **Clonar repositorio**
   ```bash
   git clone https://github.com/AntonioSanchezCaba/ChristmasTree.git
   cd ChristmasTree/scheduler-service
   ```

5. **Ejecutar con Docker**
   ```bash
   docker compose up -d
   docker compose logs -f
   ```

6. **Verificar que funciona**
   - Debes ver logs de conexión MQTT

### Opción 4: Raspberry Pi en Casa

**Ventajas**:
- ✅ Gratis después de comprar el Pi
- ✅ Bajo consumo eléctrico
- ✅ Control total

**Desventajas**:
- ❌ Necesitas tener el Pi siempre encendido
- ❌ Depende de tu internet casero

**Pasos**:

1. **Instalar Raspberry Pi OS**

2. **Actualizar sistema**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Instalar Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Clonar repositorio**
   ```bash
   cd /home/pi
   git clone https://github.com/AntonioSanchezCaba/ChristmasTree.git
   cd ChristmasTree/scheduler-service
   ```

5. **Instalar dependencias**
   ```bash
   npm install
   ```

6. **Instalar PM2**
   ```bash
   sudo npm install -g pm2
   ```

7. **Ejecutar servicio**
   ```bash
   pm2 start scheduler.js --name wled-scheduler
   pm2 startup
   pm2 save
   ```

8. **Verificar**
   ```bash
   pm2 logs wled-scheduler
   ```

### Opción 5: PC/Laptop Personal (NO Recomendado para 24/7)

Solo para pruebas temporales. Tu computadora debe estar encendida 24/7.

```bash
cd scheduler-service
npm install
npm start
```

## 🔧 Configuración Post-Deployment

### 1. Verificar Conexión MQTT

Una vez desplegado, verifica los logs:

```bash
# Railway/Render: Ver en el dashboard web

# DigitalOcean/VPS:
docker compose logs -f

# Raspberry Pi:
pm2 logs wled-scheduler
```

Debes ver:
```
✅ Conectado exitosamente a MQTT
✅ Suscrito a topic de horarios
ℹ️  Horarios actualizados: X horarios, Enabled: true
```

### 2. Probar los Horarios

1. **Ir a la página web**
2. **Abrir modal de Schedule**
3. **Crear un horario de prueba** (que empiece en 2-3 minutos)
4. **Activar "Activar Programación Automática"**
5. **Cerrar el navegador completamente**
6. **Esperar a que llegue la hora**
7. **Verificar logs del servicio** - debe mostrar:
   ```
   ⏰ Horario activo (HH:MM-HH:MM) - Encendiendo LEDs
   ```

### 3. Configurar Alertas (Opcional)

Si usas Railway/Render, puedes configurar webhooks para recibir notificaciones si el servicio se cae.

## 📊 Monitoreo

### Logs en Tiempo Real

```bash
# Railway/Render
# Ver en dashboard web

# Docker
docker compose logs -f

# PM2
pm2 logs wled-scheduler --lines 100
```

### Verificar Estado

```bash
# Docker
docker ps | grep wled-scheduler

# PM2
pm2 status
```

### Reiniciar Servicio

```bash
# Railway/Render
# Botón "Restart" en dashboard

# Docker
docker compose restart

# PM2
pm2 restart wled-scheduler
```

## 🔄 Actualizar el Servicio

### Railway/Render
1. Push cambios a GitHub
2. Automáticamente se redeploy

### DigitalOcean/VPS
```bash
cd ChristmasTree
git pull
cd scheduler-service
docker compose down
docker compose build
docker compose up -d
```

### Raspberry Pi
```bash
cd /home/pi/ChristmasTree
git pull
cd scheduler-service
npm install  # si hay cambios en dependencies
pm2 restart wled-scheduler
```

## ⚠️ Troubleshooting

### El servicio no se conecta a MQTT

**Causas posibles**:
1. Firewall bloqueando puerto 8084
2. Broker MQTT caído

**Solución**:
```bash
# Probar conexión desde el servidor
telnet mqtt.vittence.com 8084

# Si no funciona, verificar que el broker esté corriendo
```

### Los horarios no se actualizan

**Causa**: El mensaje MQTT no llegó al servicio

**Solución**:
1. Reiniciar servicio: `docker compose restart`
2. Verificar en web que horarios se guarden correctamente
3. Ver logs para confirmar recepción

### Los LEDs no encienden a la hora correcta

**Causas posibles**:
1. Zona horaria incorrecta
2. Días de semana no seleccionados
3. Scheduler deshabilitado

**Debug**:
```bash
# Ver logs con timezone
docker compose logs -f | grep "Zona horaria"

# Debe mostrar: America/Santo_Domingo
```

## 🎯 Resultado Final

Una vez configurado correctamente:

1. ✅ **Configuras horarios** desde la página web (cualquier dispositivo)
2. ✅ **Cierras el navegador** - ya no lo necesitas
3. ✅ **El servicio corre 24/7** en el servidor
4. ✅ **LEDs encienden/apagan automáticamente** según horarios
5. ✅ **Puedes ver logs** para verificar que todo funciona

## 📝 Checklist Post-Deployment

- [ ] Servicio desplegado y corriendo
- [ ] Logs muestran conexión exitosa a MQTT
- [ ] Horarios cargados correctamente
- [ ] Timezone configurado (America/Santo_Domingo)
- [ ] Prueba manual: Crear horario → cerrar browser → esperar → verificar que enciende
- [ ] Configurar monitoreo/alertas (opcional)

## 🆘 Necesitas Ayuda?

1. **Ver logs primero** - casi siempre tienen la respuesta
2. **Verificar horarios en web** - asegúrate de que estén guardados
3. **Reiniciar servicio** - a veces es todo lo que necesitas
4. **Verificar conexión MQTT** - `telnet mqtt.vittence.com 8084`

---

**¿Cuál opción elegir?**

- **Más fácil**: Railway.app o Render.com
- **Más barato**: Render.com (gratis) o Raspberry Pi
- **Más control**: DigitalOcean Droplet
- **Ya tienes Pi**: Raspberry Pi
- **Solo pruebas**: PC personal (temporal)
