#!/bin/bash

###############################################################################
# Script de Instalación Automática de Mosquitto MQTT para Oracle Linux
###############################################################################
# Este script instala y configura Mosquitto MQTT en Oracle Linux / RHEL
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
echo "  Oracle Linux / RHEL"
echo "========================================"
echo -e "${NC}"

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then
   echo -e "${RED}Error: Este script debe ejecutarse como root (usa sudo)${NC}"
   exit 1
fi

echo -e "${YELLOW}Paso 1: Actualizando sistema...${NC}"
yum update -y

echo -e "${YELLOW}Paso 2: Habilitando repositorio EPEL...${NC}"
# EPEL es necesario para Mosquitto
yum install -y oracle-epel-release-el8 || yum install -y oracle-epel-release-el9 || yum install -y epel-release

echo -e "${YELLOW}Paso 3: Instalando Mosquitto...${NC}"
yum install -y mosquitto

echo -e "${YELLOW}Paso 4: Configurando firewall...${NC}"

# Comprobar si firewalld está activo
if systemctl is-active --quiet firewalld; then
    echo "Usando firewalld..."
    firewall-cmd --permanent --add-port=1883/tcp  # MQTT
    firewall-cmd --permanent --add-port=8883/tcp  # MQTT SSL
    firewall-cmd --permanent --add-port=8083/tcp  # WebSocket
    firewall-cmd --reload
    echo -e "${GREEN}✓ Puertos añadidos a firewalld${NC}"
else
    echo "Firewalld no activo, configurando iptables directamente..."

    # Instalar iptables-services si no está
    yum install -y iptables-services

    # Añadir reglas
    iptables -I INPUT 6 -m state --state NEW -p tcp --dport 1883 -j ACCEPT
    iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8883 -j ACCEPT
    iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8083 -j ACCEPT

    # Guardar reglas
    service iptables save
    echo -e "${GREEN}✓ Reglas iptables guardadas${NC}"
fi

echo -e "${YELLOW}Paso 5: Configurando Mosquitto...${NC}"

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

echo -e "${YELLOW}Paso 6: Creando usuario MQTT...${NC}"
echo ""
echo -e "${GREEN}Introduce una contraseña para el usuario 'wled':${NC}"
echo -e "${YELLOW}(Recomendación: WledMqtt2024! o similar)${NC}"
echo ""

# Crear usuario interactivamente
mosquitto_passwd -c /etc/mosquitto/passwd wled

echo ""
echo -e "${GREEN}✓ Usuario 'wled' creado${NC}"

echo -e "${YELLOW}Paso 7: Configurando SELinux...${NC}"
# Oracle Linux tiene SELinux activado, necesitamos permitir los puertos
if command -v semanage &> /dev/null; then
    semanage port -a -t mqtt_port_t -p tcp 1883 2>/dev/null || semanage port -m -t mqtt_port_t -p tcp 1883
    semanage port -a -t mqtt_port_t -p tcp 8883 2>/dev/null || semanage port -m -t mqtt_port_t -p tcp 8883
    semanage port -a -t mqtt_port_t -p tcp 8083 2>/dev/null || semanage port -m -t mqtt_port_t -p tcp 8083
    echo -e "${GREEN}✓ Puertos añadidos a SELinux${NC}"
else
    echo -e "${YELLOW}SELinux tools no disponibles, saltando configuración...${NC}"
fi

echo -e "${YELLOW}Paso 8: Habilitando y reiniciando Mosquitto...${NC}"
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
echo "   - IP VPS: ${GREEN}${IP_PUBLICA}${NC}"
echo "   - Puerto WebSocket: ${GREEN}8083${NC}"
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
