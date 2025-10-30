#!/bin/bash

###############################################################################
# Script de Instalación Automática de Mosquitto MQTT para Oracle Cloud
###############################################################################
# Este script instala y configura Mosquitto MQTT en Ubuntu
# Compatible con Oracle Cloud Free Tier (ARM)
###############################################################################

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "========================================"
echo "  Instalación de Mosquitto MQTT"
echo "  Oracle Cloud Free Tier"
echo "========================================"
echo -e "${NC}"

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then
   echo -e "${RED}Error: Este script debe ejecutarse como root (usa sudo)${NC}"
   exit 1
fi

echo -e "${YELLOW}Paso 1: Actualizando sistema...${NC}"
apt-get update
apt-get upgrade -y

echo -e "${YELLOW}Paso 2: Instalando Mosquitto...${NC}"
apt-get install -y mosquitto mosquitto-clients

echo -e "${YELLOW}Paso 3: Configurando firewall (iptables)...${NC}"

# Verificar si iptables-persistent está instalado
if ! command -v netfilter-persistent &> /dev/null; then
    echo -e "${YELLOW}Instalando iptables-persistent...${NC}"
    DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
fi

# Permitir puerto 1883 (MQTT)
echo "Permitiendo puerto 1883 (MQTT)..."
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 1883 -j ACCEPT

# Permitir puerto 8883 (MQTT SSL)
echo "Permitiendo puerto 8883 (MQTT SSL)..."
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8883 -j ACCEPT

# Permitir puerto 8083 (WebSocket)
echo "Permitiendo puerto 8083 (WebSocket)..."
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8083 -j ACCEPT

# Guardar reglas
echo "Guardando reglas de firewall..."
netfilter-persistent save

echo -e "${YELLOW}Paso 4: Configurando Mosquitto...${NC}"

# Crear archivo de configuración
cat > /etc/mosquitto/conf.d/default.conf << 'EOF'
# Puerto MQTT estándar
listener 1883 0.0.0.0

# Requiere autenticación
allow_anonymous false

# Archivo de contraseñas
password_file /etc/mosquitto/passwd

# Logs
log_dest file /var/log/mosquitto/mosquitto.log
log_type all
log_timestamp true

# WebSocket para aplicación web
listener 8083
protocol websockets
EOF

echo -e "${GREEN}✓ Configuración creada${NC}"

echo -e "${YELLOW}Paso 5: Creando usuario MQTT...${NC}"
echo ""
echo -e "${GREEN}Introduce una contraseña para el usuario 'wled':${NC}"
echo -e "${YELLOW}(Recomendación: WledMqtt2024! o similar)${NC}"
echo ""

# Crear usuario interactivamente
mosquitto_passwd -c /etc/mosquitto/passwd wled

echo ""
echo -e "${GREEN}✓ Usuario 'wled' creado${NC}"

echo -e "${YELLOW}Paso 6: Habilitando y reiniciando Mosquitto...${NC}"
systemctl enable mosquitto
systemctl restart mosquitto

# Esperar un poco para que inicie
sleep 2

# Verificar estado
if systemctl is-active --quiet mosquitto; then
    echo -e "${GREEN}✓ Mosquitto está corriendo${NC}"
else
    echo -e "${RED}✗ Error: Mosquitto no está corriendo${NC}"
    echo "Ver logs con: sudo journalctl -u mosquitto -n 50"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================"
echo "  ¡Instalación Completada!"
echo "========================================${NC}"
echo ""
echo -e "${YELLOW}Información del Servidor:${NC}"
echo ""
IP_PUBLICA=$(curl -s https://api.ipify.org)
echo "  IP Pública: ${GREEN}${IP_PUBLICA}${NC}"
echo "  Puerto MQTT: ${GREEN}1883${NC}"
echo "  Puerto WebSocket: ${GREEN}8083${NC}"
echo "  Usuario: ${GREEN}wled${NC}"
echo "  Contraseña: ${GREEN}(la que acabas de crear)${NC}"
echo ""
echo -e "${YELLOW}Próximos Pasos:${NC}"
echo ""
echo "1. Verifica que Oracle Cloud Security List permite estos puertos:"
echo "   - 1883 (MQTT)"
echo "   - 8083 (WebSocket)"
echo ""
echo "2. Configura WLED:"
echo "   - Broker: ${GREEN}${IP_PUBLICA}${NC}"
echo "   - Port: ${GREEN}1883${NC}"
echo "   - Username: ${GREEN}wled${NC}"
echo "   - Password: ${GREEN}(tu contraseña)${NC}"
echo ""
echo "3. Configura la web app en index.html:"
echo "   broker = 'ws://${IP_PUBLICA}:8083/mqtt';"
echo ""
echo -e "${YELLOW}Comandos Útiles:${NC}"
echo ""
echo "  Ver logs:"
echo "    ${GREEN}sudo tail -f /var/log/mosquitto/mosquitto.log${NC}"
echo ""
echo "  Estado del servicio:"
echo "    ${GREEN}sudo systemctl status mosquitto${NC}"
echo ""
echo "  Reiniciar Mosquitto:"
echo "    ${GREEN}sudo systemctl restart mosquitto${NC}"
echo ""
echo "  Añadir otro usuario:"
echo "    ${GREEN}sudo mosquitto_passwd /etc/mosquitto/passwd usuario${NC}"
echo ""
echo "  Probar conexión:"
echo "    ${GREEN}mosquitto_pub -h localhost -p 1883 -u wled -P tupassword -t test -m hello${NC}"
echo ""
echo -e "${GREEN}¡Disfruta de tu broker MQTT!${NC} 🎉"
echo ""
