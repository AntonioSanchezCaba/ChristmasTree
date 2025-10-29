#!/bin/bash

###############################################################################
# Script de Actualización de DNS Dinámico (DDNS) para DuckDNS
###############################################################################
# Este script actualiza tu dominio DuckDNS con tu IP pública actual.
# Puedes ejecutarlo manualmente o configurarlo para que se ejecute automáticamente.
###############################################################################

# CONFIGURACIÓN
DOMAIN="mi-arbol-navidad"  # Cambia esto por tu subdominio de DuckDNS
TOKEN="TU-TOKEN-AQUI"      # Cambia esto por tu token de DuckDNS

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directorio de logs
LOG_DIR="$HOME/ddns-logs"
LOG_FILE="$LOG_DIR/duckdns.log"

# Crear directorio de logs si no existe
mkdir -p "$LOG_DIR"

# Función para logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Actualizando DNS Dinámico (DuckDNS)${NC}"
echo -e "${YELLOW}========================================${NC}"

# Verificar configuración
if [ "$DOMAIN" == "mi-arbol-navidad" ] || [ "$TOKEN" == "TU-TOKEN-AQUI" ]; then
    echo -e "${RED}❌ ERROR: Debes configurar tu DOMAIN y TOKEN en el script${NC}"
    echo ""
    echo "Edita este archivo y cambia:"
    echo "  DOMAIN=\"tu-subdominio-aqui\""
    echo "  TOKEN=\"tu-token-de-duckdns-aqui\""
    echo ""
    echo "Obtén tu token en: https://www.duckdns.org"
    exit 1
fi

# Obtener IP pública actual
echo -e "\n${YELLOW}🔍 Obteniendo IP pública actual...${NC}"
CURRENT_IP=$(curl -s https://api.ipify.org)

if [ -z "$CURRENT_IP" ]; then
    echo -e "${RED}❌ Error: No se pudo obtener la IP pública${NC}"
    log "ERROR: No se pudo obtener la IP pública"
    exit 1
fi

echo -e "${GREEN}✓ IP pública actual: $CURRENT_IP${NC}"

# Actualizar DuckDNS
echo -e "\n${YELLOW}📤 Actualizando DuckDNS...${NC}"
RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip=$CURRENT_IP")

if [ "$RESPONSE" == "OK" ]; then
    echo -e "${GREEN}✅ Actualización exitosa!${NC}"
    echo -e "${GREEN}   Dominio: $DOMAIN.duckdns.org${NC}"
    echo -e "${GREEN}   IP: $CURRENT_IP${NC}"
    log "SUCCESS: Dominio actualizado - $DOMAIN.duckdns.org -> $CURRENT_IP"
else
    echo -e "${RED}❌ Error al actualizar DuckDNS${NC}"
    echo -e "${RED}   Respuesta: $RESPONSE${NC}"
    log "ERROR: Fallo al actualizar - Respuesta: $RESPONSE"
    exit 1
fi

# Verificar que el DNS se actualizó
echo -e "\n${YELLOW}🔍 Verificando DNS...${NC}"
sleep 2
DNS_IP=$(nslookup "$DOMAIN.duckdns.org" 8.8.8.8 | grep -A1 "Name:" | grep "Address:" | awk '{print $2}')

if [ "$DNS_IP" == "$CURRENT_IP" ]; then
    echo -e "${GREEN}✅ DNS verificado correctamente!${NC}"
    log "VERIFIED: DNS actualizado correctamente"
else
    echo -e "${YELLOW}⚠️  El DNS aún no se ha propagado (puede tardar unos minutos)${NC}"
    echo -e "   DNS responde: $DNS_IP"
    echo -e "   IP actual: $CURRENT_IP"
    log "WARNING: DNS no propagado aún - DNS: $DNS_IP, IP: $CURRENT_IP"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}         Actualización completa${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Logs guardados en: $LOG_FILE"
