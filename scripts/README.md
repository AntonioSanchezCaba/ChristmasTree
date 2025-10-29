# Scripts de Configuración para Acceso Remoto

Esta carpeta contiene scripts y herramientas para configurar el acceso remoto a tu controlador ESP con WLED.

## Contenido

### 1. `actualizar-ddns.sh` (Linux/Mac)
Script en Bash para actualizar automáticamente tu dominio DuckDNS desde Linux o Mac.

**Uso:**
```bash
# 1. Edita el script y configura tu dominio y token
nano actualizar-ddns.sh

# 2. Dale permisos de ejecución
chmod +x actualizar-ddns.sh

# 3. Ejecuta manualmente
./actualizar-ddns.sh

# 4. Configura ejecución automática (cada 5 minutos)
crontab -e
# Añade esta línea:
*/5 * * * * /ruta/completa/a/actualizar-ddns.sh
```

**Logs:**
Los logs se guardan en `~/ddns-logs/duckdns.log`

---

### 2. `actualizar-ddns.ps1` (Windows)
Script en PowerShell para actualizar tu dominio DuckDNS desde Windows.

**Uso:**
```powershell
# 1. Edita el script y configura tu dominio y token
notepad actualizar-ddns.ps1

# 2. Ejecuta manualmente
powershell -ExecutionPolicy Bypass -File actualizar-ddns.ps1

# 3. Configura como tarea programada (cada 5 minutos)
# Abre PowerShell como Administrador y ejecuta:

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File C:\ruta\completa\a\actualizar-ddns.ps1"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive
Register-ScheduledTask -TaskName "Actualizar DDNS" -Action $action -Trigger $trigger -Principal $principal

# Verificar que se creó:
Get-ScheduledTask -TaskName "Actualizar DDNS"
```

**Logs:**
Los logs se guardan en `%USERPROFILE%\ddns-logs\duckdns.log`

---

### 3. `ESP_DDNS_Update.ino` (Arduino/ESP)
Código de ejemplo para que el ESP actualice el DDNS directamente.

**Características:**
- Actualización automática de DuckDNS desde el ESP
- Compatible con ESP32 y ESP8266
- Soporte para dual-core en ESP32
- Detección de cambios de IP

**Uso:**

#### Opción A: Modificar WLED (Avanzado)
1. Abre el código fuente de WLED
2. Integra las funciones de este archivo
3. Recompila y sube a tu ESP

#### Opción B: Firmware Standalone
1. Abre este archivo en Arduino IDE
2. Configura WiFi, dominio y token
3. Compila y sube a un ESP dedicado

#### Opción C: Usermod de WLED (Recomendado)
1. Crea un usermod siguiendo la documentación de WLED
2. Implementa el código de actualización DDNS
3. Compila con el usermod incluido

**NOTA IMPORTANTE:**
Aunque es posible hacer que el ESP actualice el DDNS directamente, **se recomienda usar los scripts externos** (Bash o PowerShell) porque:
- ✅ No modifican el código de WLED
- ✅ Más fáciles de mantener y actualizar
- ✅ Menor consumo de recursos en el ESP
- ✅ No interfieren con las actualizaciones de WLED

Este código es útil **solo si**:
- No tienes ningún ordenador/dispositivo siempre encendido
- Quieres una solución 100% autónoma
- Tienes conocimientos de programación Arduino

---

## ¿Qué Script Usar?

### Escenario 1: Tienes un ordenador en casa siempre encendido o encendido la mayor parte del tiempo
**✅ RECOMENDADO**: Usa `actualizar-ddns.sh` (Linux/Mac) o `actualizar-ddns.ps1` (Windows)

**Ventajas:**
- Configuración más simple
- No modifica WLED
- Más fiable
- Menor consumo en el ESP

### Escenario 2: No tienes ningún ordenador encendido regularmente
**✅ RECOMENDADO**: Usa `ESP_DDNS_Update.ino`

**Ventajas:**
- Solución completamente autónoma
- No requiere dispositivo adicional

**Desventajas:**
- Requiere modificar código
- Consume recursos del ESP
- Más complejo de mantener

### Escenario 3: Tienes un servidor NAS, router avanzado, o similar
**✅ RECOMENDADO**: Configura el script en ese dispositivo

Muchos routers modernos (Asus, TP-Link con OpenWrt, etc.) tienen soporte nativo para DDNS o permiten ejecutar scripts personalizados.

---

## Configuración Rápida

### Paso 1: Obtén tu Token de DuckDNS
1. Ve a https://www.duckdns.org
2. Inicia sesión con GitHub, Google, o Reddit
3. Crea un subdominio (ejemplo: `mi-arbol-navidad`)
4. Copia tu token (una cadena larga de caracteres)

### Paso 2: Elige tu Script
- **Windows**: `actualizar-ddns.ps1`
- **Linux/Mac**: `actualizar-ddns.sh`
- **ESP directamente**: `ESP_DDNS_Update.ino`

### Paso 3: Configura el Script
Abre el script y modifica:
```bash
DOMAIN="mi-arbol-navidad"  # Tu subdominio (sin .duckdns.org)
TOKEN="abc123..."          # Tu token de DuckDNS
```

### Paso 4: Prueba Manual
Ejecuta el script manualmente para verificar que funciona:
- **Windows**: Click derecho → "Ejecutar con PowerShell"
- **Linux/Mac**: `./actualizar-ddns.sh`

### Paso 5: Automatiza
Configura el script para que se ejecute automáticamente (ver instrucciones específicas arriba).

---

## Solución de Problemas

### El script dice "Error al obtener IP pública"
**Causa**: No hay conexión a internet
**Solución**: Verifica tu conexión y firewall

### El script dice "Error al actualizar DuckDNS"
**Causas posibles:**
1. Token incorrecto → Verifica en duckdns.org
2. Dominio incorrecto → Verifica que coincida con tu subdominio
3. Token expirado → Regenera el token en duckdns.org

### El DNS no se actualiza
**Causa**: La propagación DNS puede tardar 1-5 minutos
**Solución**: Espera unos minutos y prueba de nuevo

### En Windows, dice "No se puede ejecutar scripts"
**Causa**: Política de ejecución de PowerShell
**Solución**: Ejecuta como administrador:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### El ESP no puede actualizar DDNS
**Causas posibles:**
1. WiFi desconectado → Verifica credenciales
2. Poca memoria → Reduce efectos de WLED
3. Error en el código → Verifica logs en Serial Monitor

---

## Recursos Adicionales

- **Documentación DuckDNS**: https://www.duckdns.org/spec.jsp
- **Documentación WLED**: https://kno.wled.ge
- **Port Forwarding por Router**: https://portforward.com
- **Guía completa**: Ver `../SETUP_REMOTO.md`

---

## Seguridad

### Buenas Prácticas:
1. ✅ Usa puertos no estándar (8080 en lugar de 80)
2. ✅ Configura contraseña en WLED
3. ✅ Mantén WLED actualizado
4. ✅ No compartas tu token de DuckDNS
5. ✅ Revisa logs de acceso regularmente

### Contraseña en WLED:
1. Accede a WLED: `http://[IP-del-ESP]`
2. Ve a **Config → Security**
3. Configura:
   - **OTA Password**: Contraseña para actualizaciones
   - **Settings Password**: Contraseña para cambiar configuración

---

## Soporte

Si tienes problemas:
1. Revisa los logs del script
2. Verifica que DuckDNS responda: `ping mi-arbol-navidad.duckdns.org`
3. Prueba acceso local primero: `http://192.168.1.100`
4. Verifica port forwarding: https://www.yougetsignal.com/tools/open-ports/
5. Consulta la documentación completa: `../SETUP_REMOTO.md`

---

## Licencia

Estos scripts son de código abierto y pueden ser modificados libremente para tus necesidades.
