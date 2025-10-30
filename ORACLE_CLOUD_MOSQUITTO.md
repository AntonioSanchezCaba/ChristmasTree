# MQTT con Oracle Cloud Free Tier - Guía Completa

## Resumen

Monta tu propio broker Mosquitto MQTT **gratis para siempre** usando Oracle Cloud Free Tier.

### ¿Por qué Oracle Cloud?

- ✅ **Gratis PARA SIEMPRE** (no es trial como AWS)
- ✅ 2 VMs ARM gratuitas (1 OCPU, 6GB RAM cada una)
- ✅ IP pública gratuita
- ✅ 10TB de tráfico gratis al mes
- ✅ Control total de tu broker MQTT
- ✅ Sin límites de tiempo
- ✅ Puedes usar IP directa (corta) o dominio propio

### Ventajas vs Otras Soluciones

| | Oracle Cloud VPS | HiveMQ Cloud | Broker Público |
|---|---|---|---|
| **Costo** | 💰 Gratis siempre | 💰 Gratis limitado | 💰 Gratis |
| **Privado** | ✅ Sí | ✅ Sí | ❌ No |
| **URL corta** | ✅ IP o dominio | ❌ URL larga | ✅ Sí |
| **Control total** | ✅ Sí | ❌ No | ❌ No |
| **Sin límites** | ✅ Sí | ⚠️ Limitado | ⚠️ Público |

---

## Tabla de Contenidos

1. [Crear Cuenta Oracle Cloud](#paso-1-crear-cuenta-oracle-cloud)
2. [Crear VM Gratuita](#paso-2-crear-vm-gratuita)
3. [Configurar Firewall](#paso-3-configurar-firewall)
4. [Instalar Mosquitto](#paso-4-instalar-mosquitto)
5. [Configurar Usuarios](#paso-5-configurar-usuarios-y-contraseñas)
6. [Configurar SSL (Opcional)](#paso-6-configurar-ssl-opcional)
7. [Configurar WLED](#paso-7-configurar-wled)
8. [Configurar Web App](#paso-8-configurar-web-app)

**Tiempo total:** ~45 minutos

---

## Paso 1: Crear Cuenta Oracle Cloud (10 minutos)

### 1.1. Registrarse

1. Ve a: **https://www.oracle.com/cloud/free/**
2. Click en **"Start for free"** o **"Empezar gratis"**
3. Selecciona tu país
4. Rellena el formulario:
   - Email
   - Nombre y apellidos
   - Contraseña

### 1.2. Verificar Email

1. Revisa tu email
2. Click en el enlace de verificación
3. Completa el perfil

### 1.3. Verificar Identidad

Oracle requiere tarjeta de crédito/débito **solo para verificación**. NO te cobrarán nada.

1. Introduce datos de tarjeta
2. Verán un cargo de 0-1€ que desaparece (verificación)
3. **IMPORTANTE:** Oracle NUNCA te cobrará automáticamente. Tienes que activar manualmente los servicios de pago.

### 1.4. Esperar Aprobación

- Puede tardar de 5 minutos a 24 horas
- Recibirás email cuando esté lista
- Algunos usuarios son aprobados al instante

### 1.5. Acceder a la Consola

1. Ve a: **https://cloud.oracle.com**
2. Introduce tu **Cloud Account Name** (lo recibes por email)
3. Inicia sesión
4. Selecciona tu **Home Region** (más cercana a ti):
   - España: Frankfurt (Germany Central)
   - Latinoamérica: Sao Paulo (Brazil East)

---

## Paso 2: Crear VM Gratuita (15 minutos)

### 2.1. Acceder a Compute Instances

1. En la consola de Oracle Cloud
2. Menú ☰ → **Compute** → **Instances**
3. Click **"Create Instance"** o **"Crear instancia"**

### 2.2. Configurar la Instancia

#### Nombre:
```
mosquitto-mqtt-server
```

#### Placement:
```
Availability Domain: (deja el seleccionado por defecto)
```

#### Image and Shape:

**IMPORTANTE:** Selecciona **ARM** (Always Free Eligible)

1. Click en **"Change Image"** o **"Cambiar imagen"**
2. Selecciona:
   - **Canonical Ubuntu** (22.04 Minimal o 20.04)
   - Marca **"Always Free Eligible"** si aparece
3. Click **"Select Image"**

4. Click en **"Change Shape"** o **"Cambiar forma"**
5. Selecciona:
   - **Ampere** (ARM)
   - Shape: **VM.Standard.A1.Flex**
   - OCPU: **1** (o hasta 4 si quieres, es gratis)
   - Memory: **6 GB** (o hasta 24GB distribuido entre tus VMs)
6. Click **"Select Shape"**

#### Networking:

```
Virtual Cloud Network: (deja el default o crea uno nuevo)
Subnet: Public Subnet
Assign a public IPv4 address: ✓ MARCADO (IMPORTANTE)
```

#### Add SSH Keys:

**Opción A: Generar nuevo par de claves (Recomendado)**
1. Selecciona **"Generate a key pair for me"**
2. Click **"Save Private Key"** - Guarda el archivo `.key` en lugar seguro
3. Click **"Save Public Key"** - (opcional)

**Opción B: Usar tu propia clave**
1. Si tienes clave SSH existente, pégala aquí

#### Boot Volume:
```
Dejar por defecto (50GB es gratis)
```

### 2.3. Crear la Instancia

1. Click **"Create"** o **"Crear"**
2. Espera 2-5 minutos
3. El estado cambiará de "Provisioning" → **"Running"** (naranja)

### 2.4. Anotar la IP Pública

1. Una vez creada, verás **"Public IP Address"**
2. Ejemplo: `132.145.67.89`
3. **COPIA Y GUARDA ESTA IP** - la necesitarás

**Tu IP pública:** `__________________` (anótala aquí)

---

## Paso 3: Configurar Firewall (10 minutos)

Oracle Cloud tiene **dos niveles de firewall**: Cloud y SO. Debes configurar ambos.

### 3.1. Firewall de Oracle Cloud (Security List)

1. En la página de tu instancia, busca **"Primary VNIC"**
2. Click en el nombre de la **Subnet** (link azul)
3. En la sección **"Security Lists"**, click en el Security List (generalmente "Default Security List...")
4. Click **"Add Ingress Rules"** o **"Añadir reglas de entrada"**

Añade **3 reglas** (una por una):

#### Regla 1: MQTT sin SSL (puerto 1883)
```
Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Source Port Range: All
Destination Port Range: 1883
Description: MQTT
```
Click **"Add Ingress Rule"**

#### Regla 2: MQTT con SSL (puerto 8883)
```
Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Source Port Range: All
Destination Port Range: 8883
Description: MQTT SSL
```
Click **"Add Ingress Rule"**

#### Regla 3: MQTT WebSocket (puerto 8083)
```
Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Source Port Range: All
Destination Port Range: 8083
Description: MQTT WebSocket
```
Click **"Add Ingress Rule"**

### 3.2. Conectar por SSH

Ahora conéctate a tu servidor:

#### En Windows (PowerShell o CMD):
```powershell
# Cambia la ruta a donde guardaste la clave
ssh -i C:\ruta\a\tu\clave.key ubuntu@TU_IP_PUBLICA

# Ejemplo:
ssh -i C:\Users\Antonio\Downloads\ssh-key.key ubuntu@132.145.67.89
```

#### En Linux/Mac:
```bash
# Primero da permisos a la clave
chmod 600 ~/Downloads/ssh-key.key

# Conecta
ssh -i ~/Downloads/ssh-key.key ubuntu@TU_IP_PUBLICA

# Ejemplo:
ssh -i ~/Downloads/ssh-key.key ubuntu@132.145.67.89
```

**Primera vez:** Te preguntará "Are you sure you want to continue connecting?" → Escribe `yes`

Deberías ver algo como:
```
ubuntu@mosquitto-mqtt-server:~$
```

### 3.3. Firewall del Sistema Operativo (iptables)

Una vez conectado por SSH, ejecuta estos comandos:

```bash
# Ver reglas actuales
sudo iptables -L -n

# Permitir MQTT (1883)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 1883 -j ACCEPT

# Permitir MQTT SSL (8883)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8883 -j ACCEPT

# Permitir MQTT WebSocket (8083)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8083 -j ACCEPT

# Guardar las reglas para que persistan después de reiniciar
sudo netfilter-persistent save

# Si el comando anterior falla, instala primero:
sudo apt-get update
sudo apt-get install iptables-persistent -y
# Responde "Yes" a ambas preguntas
sudo netfilter-persistent save
```

**Verificar:**
```bash
sudo iptables -L -n | grep 1883
sudo iptables -L -n | grep 8883
sudo iptables -L -n | grep 8083
```

Deberías ver las 3 reglas.

---

## Paso 4: Instalar Mosquitto (5 minutos)

### 4.1. Script de Instalación Automática

He creado un script que instala todo automáticamente. En tu SSH:

```bash
# Descargar el script
wget https://raw.githubusercontent.com/AntonioSanchezCaba/ChristmasTree/main/scripts/install-mosquitto.sh

# O si prefieres, copia el script manualmente (ver más abajo)

# Dar permisos de ejecución
chmod +x install-mosquitto.sh

# Ejecutar
sudo ./install-mosquitto.sh
```

### 4.2. Instalación Manual (si prefieres)

Si prefieres instalarlo manualmente paso a paso:

```bash
# Actualizar sistema
sudo apt-get update
sudo apt-get upgrade -y

# Instalar Mosquitto y herramientas
sudo apt-get install -y mosquitto mosquitto-clients

# Habilitar Mosquitto para que inicie al arrancar
sudo systemctl enable mosquitto

# Verificar que está corriendo
sudo systemctl status mosquitto
```

Deberías ver:
```
● mosquitto.service - Mosquitto MQTT Broker
   Active: active (running)
```

### 4.3. Verificar Instalación

```bash
# Verificar versión
mosquitto -h | head -n 1

# Debería mostrar algo como:
# mosquitto version 2.0.11
```

---

## Paso 5: Configurar Usuarios y Contraseñas (5 minutos)

### 5.1. Crear Archivo de Contraseñas

```bash
# Crear usuario 'wled' con contraseña
sudo mosquitto_passwd -c /etc/mosquitto/passwd wled

# Te pedirá la contraseña dos veces
# Usa una contraseña fuerte, ejemplo: WledMqtt2024!
```

**Anota tu contraseña:** `_________________`

### 5.2. Crear usuario adicional (opcional)

Si quieres crear más usuarios (para la web, móvil, etc.):

```bash
# Añadir usuario 'webapp' (sin -c para no sobrescribir)
sudo mosquitto_passwd /etc/mosquitto/passwd webapp
```

### 5.3. Configurar Mosquitto

Crea el archivo de configuración:

```bash
sudo nano /etc/mosquitto/conf.d/default.conf
```

Pega este contenido:

```
# Escuchar en todos los interfaces
listener 1883 0.0.0.0

# Permitir conexiones anónimas (NO - requiere autenticación)
allow_anonymous false

# Archivo de contraseñas
password_file /etc/mosquitto/passwd

# Logs
log_dest file /var/log/mosquitto/mosquitto.log
log_type all

# WebSocket (para la web)
listener 8083
protocol websockets
```

**Guardar y salir:**
- Presiona `Ctrl+X`
- Presiona `Y`
- Presiona `Enter`

### 5.4. Reiniciar Mosquitto

```bash
sudo systemctl restart mosquitto

# Verificar que no hay errores
sudo systemctl status mosquitto

# Ver logs
sudo tail -f /var/log/mosquitto/mosquitto.log
```

Presiona `Ctrl+C` para salir de los logs.

---

## Paso 6: Configurar SSL (Opcional pero Recomendado)

SSL/TLS encripta la comunicación. **Recomendado** si vas a usar desde internet.

### Opción A: Con Dominio Propio (Certificado real)

Si tienes un dominio, puedes usar Let's Encrypt (gratis):

```bash
# Instalar Certbot
sudo apt-get install -y certbot

# Detener Mosquitto temporalmente
sudo systemctl stop mosquitto

# Obtener certificado (cambia mqtt.tudominio.com)
sudo certbot certonly --standalone -d mqtt.tudominio.com

# Copiar certificados para Mosquitto
sudo cp /etc/letsencrypt/live/mqtt.tudominio.com/fullchain.pem /etc/mosquitto/certs/
sudo cp /etc/letsencrypt/live/mqtt.tudominio.com/privkey.pem /etc/mosquitto/certs/
sudo chown mosquitto:mosquitto /etc/mosquitto/certs/*.pem

# Actualizar configuración
sudo nano /etc/mosquitto/conf.d/default.conf
```

Añade estas líneas:

```
listener 8883 0.0.0.0
certfile /etc/mosquitto/certs/fullchain.pem
keyfile /etc/mosquitto/certs/privkey.pem
```

```bash
# Reiniciar
sudo systemctl start mosquitto
```

### Opción B: Sin Dominio (Certificado auto-firmado)

```bash
# Crear directorio para certificados
sudo mkdir -p /etc/mosquitto/certs
cd /etc/mosquitto/certs

# Generar certificado auto-firmado (válido 10 años)
sudo openssl req -new -x509 -days 3650 -extensions v3_ca -keyout ca.key -out ca.crt \
  -subj "/CN=MosquittoCA"

sudo openssl genrsa -out server.key 2048

sudo openssl req -new -out server.csr -key server.key \
  -subj "/CN=TU_IP_PUBLICA"

sudo openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 3650

# Permisos
sudo chown mosquitto:mosquitto /etc/mosquitto/certs/*
sudo chmod 600 /etc/mosquitto/certs/*.key

# Actualizar configuración
sudo nano /etc/mosquitto/conf.d/default.conf
```

Añade:
```
listener 8883 0.0.0.0
certfile /etc/mosquitto/certs/server.crt
keyfile /etc/mosquitto/certs/server.key
cafile /etc/mosquitto/certs/ca.crt
```

**Guardar** y reiniciar:
```bash
sudo systemctl restart mosquitto
```

---

## Paso 7: Configurar WLED (2 minutos)

### 7.1. Acceder a WLED

1. Abre tu navegador
2. Ve a: `http://192.168.1.100` (o la IP de tu ESP)

### 7.2. Configurar MQTT

1. Click en **"Config"** (engranaje)
2. Click en **"Sync Interfaces"**
3. Baja hasta **"MQTT"**

### 7.3. Introducir Datos

```
┌─────────────────────────────────────────────┐
│ Enable MQTT              [✓]                │
│                                             │
│ Broker:                                     │
│ [TU_IP_PUBLICA_________________]           │ ← Ej: 132.145.67.89
│                                             │
│ Port:                                       │
│ [1883___]                                   │ ← Sin SSL
│ [8883___]                                   │ ← Con SSL (si configuraste)
│                                             │
│ Username:                                   │
│ [wled_______________________________]      │ ← Usuario creado
│                                             │
│ Password:                                   │
│ [WledMqtt2024!_____________________]       │ ← Tu contraseña
│                                             │
│ Client ID:                                  │
│ [wled_tree_casa____________________]       │ ← ID único
│                                             │
│ Device Topic:                               │
│ [wled/tree_____________________]           │ ← Topic personalizado
│                                             │
│ Group Topic:                                │
│ [wled/all______________________]           │ ← Topic de grupo
│                                             │
└─────────────────────────────────────────────┘
```

### 7.4. Guardar

1. Click **"Save"**
2. WLED se reiniciará
3. Espera 10-20 segundos

### 7.5. Verificar

1. Vuelve a WLED
2. Ve a **"Info"**
3. Busca **"MQTT"**
4. Debería decir: **"Connected"** ✅

---

## Paso 8: Configurar Web App (2 minutos)

La aplicación web ya está lista, solo necesitas actualizar la configuración con tu IP.

### 8.1. Editar index.html

Abre `index.html` y busca la sección de MQTT (línea ~820 aproximadamente).

Encontrarás esta sección:

```javascript
} else if (connectionMode === 'mqtt-oracle') {
    // Tu servidor Oracle Cloud
    broker = 'ws://TU_IP_ORACLE:8083/mqtt';  // ← CAMBIAR AQUÍ
    username = 'wled';
    password = 'WledMqtt2024!';
}
```

Cámbialo por:

```javascript
} else if (connectionMode === 'mqtt-oracle') {
    // Tu servidor Oracle Cloud
    broker = 'ws://132.145.67.89:8083/mqtt';  // ← Tu IP pública
    username = 'wled';                         // ← Tu usuario
    password = 'WledMqtt2024!';               // ← Tu contraseña
}
```

**IMPORTANTE:**
- Usa `ws://` (sin SSL) con puerto 8083
- O `wss://` (con SSL) con puerto 8084 si configuraste SSL

### 8.2. Usar la Aplicación

1. Abre `index.html` en tu navegador
2. Selecciona modo **"MQTT Oracle Cloud"**
3. Debería aparecer **"✅ Conectado a MQTT"**
4. Cambia un color
5. ¡El árbol debería cambiar! 🎄

---

## Probar la Conexión

### Desde tu Ordenador (para verificar)

**Instalar cliente MQTT:**

Windows:
```powershell
# Con Chocolatey
choco install mosquitto

# O descarga desde: https://mosquitto.org/download/
```

Linux/Mac:
```bash
# Ubuntu/Debian
sudo apt-get install mosquitto-clients

# Mac
brew install mosquitto
```

**Probar conexión:**

```bash
# Suscribirse a topic (recibir mensajes)
mosquitto_sub -h TU_IP_PUBLICA -p 1883 -u wled -P WledMqtt2024! -t "wled/#" -v

# En otra terminal, publicar mensaje
mosquitto_pub -h TU_IP_PUBLICA -p 1883 -u wled -P WledMqtt2024! -t "wled/tree/api" -m '{"on":true,"bri":255}'
```

Si ves el mensaje en la primera terminal, **¡funciona!** ✅

---

## Solución de Problemas

### WLED no se conecta

**Síntoma:** WLED → Info → MQTT dice "Disconnected"

**Soluciones:**

1. **Verifica que Mosquitto esté corriendo:**
   ```bash
   sudo systemctl status mosquitto
   ```

2. **Verifica logs de Mosquitto:**
   ```bash
   sudo tail -f /var/log/mosquitto/mosquitto.log
   ```
   Busca errores de autenticación

3. **Verifica firewall:**
   ```bash
   sudo iptables -L -n | grep 1883
   ```

4. **Prueba conexión desde tu PC:**
   ```bash
   mosquitto_pub -h TU_IP -p 1883 -u wled -P TU_PASSWORD -t "test" -m "hello"
   ```

5. **Verifica usuario/contraseña en WLED:**
   - Mayúsculas y minúsculas importan
   - Sin espacios antes/después

---

### Web no se conecta

**Síntoma:** La web dice "Error MQTT"

**Soluciones:**

1. **Verifica puerto WebSocket:**
   - Debe ser **8083** (sin SSL)
   - Protocolo `ws://` (no `wss://`)

2. **Verifica configuración en Mosquitto:**
   ```bash
   sudo cat /etc/mosquitto/conf.d/default.conf | grep -A2 websockets
   ```
   Debe mostrar:
   ```
   listener 8083
   protocol websockets
   ```

3. **Abre consola del navegador:**
   - F12 → Console
   - Busca errores WebSocket

4. **Prueba desde terminal:**
   ```bash
   # Instalar wscat
   npm install -g wscat

   # Conectar
   wscat -c ws://TU_IP:8083
   ```

---

### Problemas de SSL

**Síntoma:** No se conecta con SSL/TLS (puerto 8883)

**Soluciones:**

1. **Verifica certificados:**
   ```bash
   sudo ls -la /etc/mosquitto/certs/
   ```

2. **Verifica configuración:**
   ```bash
   sudo cat /etc/mosquitto/conf.d/default.conf | grep -A3 8883
   ```

3. **Prueba conexión SSL:**
   ```bash
   mosquitto_pub -h TU_IP -p 8883 --cafile /etc/mosquitto/certs/ca.crt \
     -u wled -P TU_PASSWORD -t "test" -m "hello"
   ```

---

## Mantenimiento

### Renovar Certificado SSL (Let's Encrypt)

Los certificados de Let's Encrypt expiran cada 90 días. Renueva automáticamente:

```bash
# Crear script de renovación
sudo nano /etc/cron.monthly/renovar-ssl-mosquitto
```

Pega:
```bash
#!/bin/bash
certbot renew --quiet
cp /etc/letsencrypt/live/mqtt.tudominio.com/fullchain.pem /etc/mosquitto/certs/
cp /etc/letsencrypt/live/mqtt.tudominio.com/privkey.pem /etc/mosquitto/certs/
chown mosquitto:mosquitto /etc/mosquitto/certs/*.pem
systemctl restart mosquitto
```

```bash
# Dar permisos
sudo chmod +x /etc/cron.monthly/renovar-ssl-mosquitto
```

### Ver Logs

```bash
# Logs en tiempo real
sudo tail -f /var/log/mosquitto/mosquitto.log

# Últimas 100 líneas
sudo tail -n 100 /var/log/mosquitto/mosquitto.log

# Buscar errores
sudo grep -i error /var/log/mosquitto/mosquitto.log
```

### Actualizar Mosquitto

```bash
sudo apt-get update
sudo apt-get upgrade mosquitto mosquitto-clients
sudo systemctl restart mosquitto
```

---

## Configuración Avanzada

### Limitar Topics por Usuario

Edita la configuración:

```bash
sudo nano /etc/mosquitto/conf.d/acl.conf
```

```
# Archivo ACL
acl_file /etc/mosquitto/acl

# Usuario 'wled' solo puede publicar/suscribirse a wled/*
user wled
topic readwrite wled/#

# Usuario 'webapp' solo puede publicar a wled/commands/*
user webapp
topic read wled/#
topic write wled/commands/#
```

Crea el archivo ACL:
```bash
sudo nano /etc/mosquitto/acl
```

```
# Usuario wled puede todo en wled/*
user wled
topic readwrite wled/#

# Usuario webapp
user webapp
topic read wled/#
topic write wled/commands/#
```

Reinicia:
```bash
sudo systemctl restart mosquitto
```

---

## Resumen de Configuración

### Tu Servidor:
```
IP Pública: TU_IP_ORACLE
Puerto MQTT: 1883 (sin SSL) / 8883 (con SSL)
Puerto WebSocket: 8083 (sin SSL) / 8084 (con SSL)
Usuario: wled
Contraseña: WledMqtt2024!
```

### En WLED:
```
Broker: TU_IP_ORACLE
Port: 1883
Username: wled
Password: WledMqtt2024!
Device Topic: wled/tree
```

### En la Web:
```javascript
broker = 'ws://TU_IP_ORACLE:8083/mqtt';
username = 'wled';
password = 'WledMqtt2024!';
```

---

## Costos

| Concepto | Costo |
|----------|-------|
| **Oracle Cloud VM** | 💰 **Gratis** para siempre |
| **IP Pública** | 💰 **Gratis** |
| **Tráfico (10TB/mes)** | 💰 **Gratis** |
| **Dominio (opcional)** | 💰 ~10€/año |
| **Total** | 💰 **0€** (sin dominio) |

---

## Backup y Recuperación

### Hacer Backup de Configuración

```bash
# En tu VPS
sudo tar -czf mosquitto-backup.tar.gz \
  /etc/mosquitto/conf.d/ \
  /etc/mosquitto/passwd \
  /etc/mosquitto/acl \
  /etc/mosquitto/certs/

# Descargar a tu ordenador
# Windows (PowerShell):
scp -i C:\ruta\a\clave.key ubuntu@TU_IP:/home/ubuntu/mosquitto-backup.tar.gz C:\backups\

# Linux/Mac:
scp -i ~/clave.key ubuntu@TU_IP:/home/ubuntu/mosquitto-backup.tar.gz ~/backups/
```

### Restaurar Backup

```bash
# Subir backup
scp -i ~/clave.key ~/backups/mosquitto-backup.tar.gz ubuntu@TU_IP:/home/ubuntu/

# En el VPS
sudo tar -xzf mosquitto-backup.tar.gz -C /
sudo systemctl restart mosquitto
```

---

## Conclusión

**¡Felicidades!** 🎉 Ahora tienes:

- ✅ Broker MQTT privado **gratis para siempre**
- ✅ Control total de tu infraestructura
- ✅ Sin límites de dispositivos o tráfico
- ✅ IP corta que cabe perfectamente en WLED
- ✅ Conexión segura con usuario/contraseña
- ✅ Opcional: SSL/TLS para encriptación

**Próximos pasos:**
1. ✅ WLED conectado → Check logs
2. ✅ Web app conectada → Prueba cambiar colores
3. ✅ Todo funciona → ¡Disfruta! 🎄

---

## Recursos Adicionales

- **Documentación Mosquitto:** https://mosquitto.org/documentation/
- **Oracle Cloud Docs:** https://docs.oracle.com/en-us/iaas/Content/home.htm
- **WLED MQTT:** https://kno.wled.ge/interfaces/mqtt/

---

**¿Problemas?** Revisa la sección de solución de problemas o consulta los logs.
