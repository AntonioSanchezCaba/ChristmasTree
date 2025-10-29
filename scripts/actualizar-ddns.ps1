###############################################################################
# Script de Actualización de DNS Dinámico (DDNS) para DuckDNS - Windows
###############################################################################
# Este script actualiza tu dominio DuckDNS con tu IP pública actual.
# Puedes ejecutarlo manualmente o configurarlo como tarea programada.
###############################################################################

# CONFIGURACIÓN
$DOMAIN = "mi-arbol-navidad"  # Cambia esto por tu subdominio de DuckDNS
$TOKEN = "TU-TOKEN-AQUI"      # Cambia esto por tu token de DuckDNS

# Directorio de logs
$LogDir = "$env:USERPROFILE\ddns-logs"
$LogFile = "$LogDir\duckdns.log"

# Crear directorio de logs si no existe
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

# Función para logging
function Write-Log {
    param($Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] $Message"
    Write-Host $LogMessage
    Add-Content -Path $LogFile -Value $LogMessage
}

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  Actualizando DNS Dinámico (DuckDNS)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Verificar configuración
if ($DOMAIN -eq "mi-arbol-navidad" -or $TOKEN -eq "TU-TOKEN-AQUI") {
    Write-Host ""
    Write-Host "❌ ERROR: Debes configurar tu DOMAIN y TOKEN en el script" -ForegroundColor Red
    Write-Host ""
    Write-Host "Edita este archivo y cambia:"
    Write-Host '  $DOMAIN = "tu-subdominio-aqui"'
    Write-Host '  $TOKEN = "tu-token-de-duckdns-aqui"'
    Write-Host ""
    Write-Host "Obtén tu token en: https://www.duckdns.org"
    exit 1
}

# Obtener IP pública actual
Write-Host ""
Write-Host "🔍 Obteniendo IP pública actual..." -ForegroundColor Yellow
try {
    $CurrentIP = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
    Write-Host "✓ IP pública actual: $CurrentIP" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: No se pudo obtener la IP pública" -ForegroundColor Red
    Write-Log "ERROR: No se pudo obtener la IP pública - $_"
    exit 1
}

# Actualizar DuckDNS
Write-Host ""
Write-Host "📤 Actualizando DuckDNS..." -ForegroundColor Yellow
try {
    $UpdateUrl = "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip=$CurrentIP"
    $Response = (Invoke-WebRequest -Uri $UpdateUrl -UseBasicParsing).Content

    if ($Response -eq "OK") {
        Write-Host "✅ Actualización exitosa!" -ForegroundColor Green
        Write-Host "   Dominio: $DOMAIN.duckdns.org" -ForegroundColor Green
        Write-Host "   IP: $CurrentIP" -ForegroundColor Green
        Write-Log "SUCCESS: Dominio actualizado - $DOMAIN.duckdns.org -> $CurrentIP"
    } else {
        Write-Host "❌ Error al actualizar DuckDNS" -ForegroundColor Red
        Write-Host "   Respuesta: $Response" -ForegroundColor Red
        Write-Log "ERROR: Fallo al actualizar - Respuesta: $Response"
        exit 1
    }
} catch {
    Write-Host "❌ Error al conectar con DuckDNS: $_" -ForegroundColor Red
    Write-Log "ERROR: Excepción al actualizar - $_"
    exit 1
}

# Verificar que el DNS se actualizó
Write-Host ""
Write-Host "🔍 Verificando DNS..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    $DnsResult = Resolve-DnsName "$DOMAIN.duckdns.org" -Server 8.8.8.8 -Type A -ErrorAction Stop
    $DnsIP = $DnsResult.IPAddress

    if ($DnsIP -eq $CurrentIP) {
        Write-Host "✅ DNS verificado correctamente!" -ForegroundColor Green
        Write-Log "VERIFIED: DNS actualizado correctamente"
    } else {
        Write-Host "⚠️  El DNS aún no se ha propagado (puede tardar unos minutos)" -ForegroundColor Yellow
        Write-Host "   DNS responde: $DnsIP"
        Write-Host "   IP actual: $CurrentIP"
        Write-Log "WARNING: DNS no propagado aún - DNS: $DnsIP, IP: $CurrentIP"
    }
} catch {
    Write-Host "⚠️  No se pudo verificar el DNS (puede tardar en propagarse)" -ForegroundColor Yellow
    Write-Log "WARNING: No se pudo verificar DNS - $_"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "         Actualización completa" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Logs guardados en: $LogFile"

# ============================================================================
# INSTRUCCIONES PARA CONFIGURAR TAREA PROGRAMADA
# ============================================================================
<#
Para ejecutar este script automáticamente cada 5 minutos:

1. Abre PowerShell como Administrador
2. Ejecuta el siguiente comando (ajusta la ruta al script):

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File C:\ruta\a\actualizar-ddns.ps1"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive
Register-ScheduledTask -TaskName "Actualizar DDNS" -Action $action -Trigger $trigger -Principal $principal

3. Verifica que la tarea se creó:
Get-ScheduledTask -TaskName "Actualizar DDNS"

4. Para eliminar la tarea:
Unregister-ScheduledTask -TaskName "Actualizar DDNS" -Confirm:$false
#>
