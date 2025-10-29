# Configuración de Acceso Remoto para ESP con WLED

## Resumen
Esta guía te permite acceder a tu controlador ESP con WLED desde internet usando tu dominio web, **sin necesidad de MQTT ni dispositivos intermedios** como Raspberry Pi.

## Arquitectura de la Solución

```
Internet → Tu Dominio (DDNS) → Router (Port Forward) → ESP con WLED (IP Privada)
```

## Opción 1: Port Forwarding + DDNS (Recomendado)

### Ventajas
- ✅ No requiere software adicional
- ✅ No necesita dispositivo intermedio
- ✅ Conexión directa al ESP
- ✅ Latencia mínima
- ✅ Configuración permanente

### Requisitos
1. Router con acceso de administrador
2. IP pública (aunque sea dinámica)
3. Cuenta en servicio DDNS gratuito

---

## Paso 1: Configurar IP Estática para el ESP

### En tu Router:
1. Accede a tu router (generalmente `192.168.1.1` o `192.168.0.1`)
2. Busca la sección **DHCP** o **Reserva de IP**
3. Encuentra tu ESP en la lista de dispositivos
4. Asigna una IP estática (ejemplo: `192.168.1.100`)
5. Anota la dirección MAC del ESP

### En WLED (alternativa):
1. Accede a WLED: `http://[IP-del-ESP]`
2. Ve a **Config → WiFi Setup**
3. Configura:
   - **Static IP**: `192.168.1.100` (o la IP que prefieras)
   - **Gateway**: `192.168.1.1` (la IP de tu router)
   - **Subnet**: `255.255.255.0`
   - **DNS**: `8.8.8.8`

---

## Paso 2: Configurar Port Forwarding

### En tu Router:

#### Ejemplo 1: Router TP-Link
1. Ve a **Forwarding → Virtual Servers**
2. Añade una nueva regla:
   - **Service Port**: `80` (puerto externo)
   - **Internal Port**: `80` (puerto WLED)
   - **IP Address**: `192.168.1.100` (IP del ESP)
   - **Protocol**: `TCP`
   - **Status**: `Enabled`

#### Ejemplo 2: Router Movistar (España)
1. Ve a **Configuración Avanzada → NAT**
2. Añade regla:
   - **Puerto externo**: `8080`
   - **Puerto interno**: `80`
   - **IP**: `192.168.1.100`
   - **Protocolo**: `TCP`

#### Ejemplo 3: Router Genérico
Busca secciones con nombres como:
- Port Forwarding
- Virtual Server
- NAT
- Aplicaciones y Juegos

**IMPORTANTE**: Por seguridad, se recomienda usar un puerto externo diferente al 80 (ejemplo: 8080, 8888)

---

## Paso 3: Configurar DNS Dinámico (DDNS)

Tu IP pública cambia periódicamente. Un servicio DDNS actualiza automáticamente tu dominio cuando cambia la IP.

### Servicios DDNS Gratuitos Recomendados:

#### Opción A: DuckDNS (Más Simple)
1. Ve a https://www.duckdns.org
2. Inicia sesión con GitHub/Google
3. Crea un subdominio: `mi-arbol-navidad.duckdns.org`
4. Anota tu **token**

**Configuración en Router (si soporta DuckDNS):**
- Dominio: `mi-arbol-navidad.duckdns.org`
- Token: `[tu-token]`

**Si tu router NO soporta DDNS:**
Usa el script de actualización automática (ver Paso 4)

#### Opción B: No-IP
1. Ve a https://www.noip.com
2. Crea cuenta gratuita
3. Crea hostname: `mi-arbol.ddns.net`
4. Descarga cliente No-IP si tu router no lo soporta

#### Opción C: Usar tu propio dominio con Cloudflare
1. Añade tu dominio a Cloudflare (gratis)
2. Crea un registro A: `wled.tudominio.com`
3. Usa la API de Cloudflare para actualizar la IP

---

## Paso 4: Actualización Automática de IP (Si tu router NO soporta DDNS)

### Script para ejecutar en cualquier ordenador de tu red local:

#### Windows (PowerShell)
Guarda como `actualizar-ddns.ps1`:
```powershell
# DuckDNS
$domain = "mi-arbol-navidad"
$token = "TU-TOKEN-AQUI"
Invoke-WebRequest "https://www.duckdns.org/update?domains=$domain&token=$token"
```

Crea tarea programada (cada 5 minutos):
```
schtasks /create /tn "Actualizar DDNS" /tr "powershell -File C:\ruta\actualizar-ddns.ps1" /sc minute /mo 5
```

#### Linux/Mac
Guarda como `actualizar-ddns.sh`:
```bash
#!/bin/bash
# DuckDNS
echo url="https://www.duckdns.org/update?domains=mi-arbol-navidad&token=TU-TOKEN-AQUI&ip=" | curl -k -o ~/duckdns/duck.log -K -
```

Añade a crontab:
```bash
chmod +x actualizar-ddns.sh
crontab -e
# Añade: */5 * * * * ~/actualizar-ddns.sh
```

#### Desde el ESP (Opción Avanzada)
Puedes hacer que el propio ESP actualice el DDNS. Esto requiere modificar el código de WLED, pero es la solución más elegante ya que **no requiere ningún dispositivo adicional**.

Ver archivo: `ESP_DDNS_UPDATE.ino` (más abajo)

---

## Paso 5: Configurar HTTPS (Opcional pero Recomendado)

### Opción A: Cloudflare (Gratis y Simple)
1. Añade tu dominio DDNS a Cloudflare
2. Activa **SSL/TLS → Full**
3. El tráfico se encripta automáticamente

### Opción B: Let's Encrypt + Nginx (Avanzado)
Requiere un servidor intermedio (no cumple tu requisito)

---

## Paso 6: Probar la Conexión

### 1. Verifica tu IP pública:
```
https://api.ipify.org
```

### 2. Prueba el port forwarding:
Desde fuera de tu red (usando datos móviles):
```
http://[tu-ip-publica]:8080
```

### 3. Prueba el dominio DDNS:
```
http://mi-arbol-navidad.duckdns.org:8080
```

### 4. Accede desde la aplicación web:
La aplicación detectará automáticamente si estás en red local o remota.

---

## Configuración Final en la Aplicación Web

La aplicación `index.html` ya está preparada con:

1. **Detección automática de red**: Detecta si estás en LAN o internet
2. **Perfiles de conexión**:
   - Local: `192.168.1.100`
   - Remoto: `mi-arbol-navidad.duckdns.org:8080`
3. **Fallback automático**: Si falla una conexión, prueba la otra

Solo necesitas:
1. Abrir la aplicación web
2. Ir a **Configuración → Acceso Remoto**
3. Introducir tu dominio DDNS

---

## Seguridad

### Medidas Implementadas:
1. ✅ Puerto no estándar (8080 en lugar de 80)
2. ✅ Solo tráfico TCP al puerto específico

### Recomendaciones Adicionales:
1. **Configura contraseña en WLED**:
   - WLED → Config → Security → OTA Password
   - Settings Password

2. **Limita acceso por IP** (en router):
   - Whitelist de IPs permitidas (si tu ISP tiene IP fija)

3. **Usa VPN** (alternativa avanzada):
   - Configura WireGuard/OpenVPN en tu router
   - Accede a tu red local de forma segura

4. **Monitoreo**:
   - Revisa logs de tu router periódicamente
   - Cambia contraseñas regularmente

---

## Solución de Problemas

### No puedo acceder desde internet
1. Verifica que port forwarding esté activo: https://www.yougetsignal.com/tools/open-ports/
2. Comprueba tu IP pública: https://api.ipify.org
3. Verifica que DDNS esté actualizado: `ping mi-arbol-navidad.duckdns.org`
4. Comprueba firewall del router

### Funciona desde móvil (4G) pero no desde wifi
- Es normal: es porque estás en la misma red. El port forwarding no funciona desde dentro de la red local (hairpin NAT).
- Solución: La app detecta automáticamente y usa IP local

### WLED se congela o desconecta
- Puede ser problema de energía
- Usa fuente de alimentación adecuada (5V, mínimo 2A)

### El dominio DDNS no actualiza
- Verifica que el script/cliente esté ejecutándose
- Comprueba logs del servicio DDNS
- Verifica token/credenciales

---

## Opción 2: Cloudflare Tunnel (Sin Port Forwarding)

Si no puedes/quieres abrir puertos, existe Cloudflare Tunnel:

### Ventajas:
- No requiere port forwarding
- Más seguro (no expones IP pública)
- HTTPS automático

### Desventajas:
- **Requiere un dispositivo siempre encendido** (no cumple tu requisito)
- Más complejo de configurar

Si estás interesado, puedo proporcionar guía detallada.

---

## Opción 3: Servicio Webhook + Polling (Sin Port Forwarding)

Otra alternativa sin abrir puertos:

### Cómo funciona:
1. La web envía comandos a un servidor cloud (Firebase, Vercel, etc.)
2. El ESP consulta periódicamente (cada 1-5 segundos) si hay comandos
3. El ESP ejecuta los comandos y reporta estado

### Ventajas:
- No requiere port forwarding
- No requiere IP pública
- Funciona detrás de cualquier NAT

### Desventajas:
- Latencia (1-5 segundos)
- Requiere servidor cloud (puede ser gratis)
- Consumo de ancho de banda del ESP

**¿Te interesa esta opción?** Puedo implementarla si prefieres evitar port forwarding.

---

## Resumen de Configuración Rápida

```bash
# 1. IP estática ESP: 192.168.1.100
# 2. Port Forwarding: 8080 (externo) → 80 (interno, IP: 192.168.1.100)
# 3. DDNS: mi-arbol-navidad.duckdns.org
# 4. Acceso remoto: http://mi-arbol-navidad.duckdns.org:8080
# 5. Acceso local: http://192.168.1.100
```

---

## Soporte

Si tienes problemas con la configuración:
1. Verifica cada paso sistemáticamente
2. Usa herramientas de diagnóstico mencionadas
3. Revisa logs del router y WLED
4. Consulta documentación de tu router específico

---

## Próximos Pasos

Una vez configurado el acceso remoto:
1. La aplicación web detectará automáticamente la red
2. Podrás controlar tus LEDs desde cualquier lugar
3. Sin latencia (conexión directa)
4. Sin costes adicionales
