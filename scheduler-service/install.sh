#!/bin/bash

###############################################################################
# WLED Christmas Tree Scheduler - Instalación Automática
#
# Este script instala y configura el scheduler service automáticamente
# Solo necesitas ejecutarlo UNA VEZ en tu VPS
###############################################################################

set -e  # Salir si hay algún error

echo ""
echo "=========================================="
echo "   WLED Scheduler - Instalación Automática"
echo "=========================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que se ejecuta como root o con sudo
if [ "$EUID" -ne 0 ]; then
    print_error "Este script debe ejecutarse con sudo"
    echo "Usa: curl -fsSL https://raw.githubusercontent.com/AntonioSanchezCaba/ChristmasTree/main/scheduler-service/install.sh | sudo bash"
    exit 1
fi

# 1. Verificar/Instalar Node.js
print_info "Verificando Node.js..."
if ! command -v node &> /dev/null; then
    print_info "Node.js no encontrado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    print_info "Node.js instalado: $(node --version)"
else
    print_info "Node.js ya instalado: $(node --version)"
fi

# 2. Verificar/Instalar PM2
print_info "Verificando PM2..."
if ! command -v pm2 &> /dev/null; then
    print_info "PM2 no encontrado. Instalando..."
    npm install -g pm2
    print_info "PM2 instalado: $(pm2 --version)"
else
    print_info "PM2 ya instalado: $(pm2 --version)"
fi

# 3. Crear directorio de instalación
INSTALL_DIR="/opt/wled-scheduler"
print_info "Creando directorio de instalación: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 4. Descargar archivos necesarios
print_info "Descargando archivos del scheduler..."

# Descargar scheduler.js
curl -fsSL https://raw.githubusercontent.com/AntonioSanchezCaba/ChristmasTree/main/scheduler-service/scheduler.js -o scheduler.js

# Descargar package.json
curl -fsSL https://raw.githubusercontent.com/AntonioSanchezCaba/ChristmasTree/main/scheduler-service/package.json -o package.json

print_info "Archivos descargados correctamente"

# 5. Instalar dependencias
print_info "Instalando dependencias npm..."
npm install --production

# 6. Configurar permisos
print_info "Configurando permisos..."
chown -R $SUDO_USER:$SUDO_USER "$INSTALL_DIR"

# 7. Detener servicio anterior si existe
print_info "Verificando servicios anteriores..."
if pm2 list | grep -q "wled-scheduler"; then
    print_warn "Servicio anterior encontrado. Deteniendo..."
    sudo -u $SUDO_USER pm2 delete wled-scheduler || true
fi

# 8. Iniciar servicio con PM2
print_info "Iniciando servicio con PM2..."
cd "$INSTALL_DIR"
sudo -u $SUDO_USER pm2 start scheduler.js --name wled-scheduler

# 9. Configurar auto-inicio
print_info "Configurando inicio automático al boot..."
sudo -u $SUDO_USER pm2 save
env PATH=$PATH:/usr/bin pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER > /tmp/pm2_startup.sh
bash /tmp/pm2_startup.sh
rm /tmp/pm2_startup.sh

# 10. Verificar estado
print_info "Verificando estado del servicio..."
sleep 2
sudo -u $SUDO_USER pm2 status

echo ""
echo "=========================================="
echo -e "${GREEN}   ✅ INSTALACIÓN COMPLETADA${NC}"
echo "=========================================="
echo ""
echo "El servicio está corriendo en segundo plano."
echo ""
echo "Comandos útiles:"
echo "  - Ver logs:      pm2 logs wled-scheduler"
echo "  - Ver estado:    pm2 status"
echo "  - Reiniciar:     pm2 restart wled-scheduler"
echo "  - Detener:       pm2 stop wled-scheduler"
echo ""
echo "Archivos instalados en: $INSTALL_DIR"
echo ""

# Mostrar logs iniciales
print_info "Mostrando logs iniciales (presiona Ctrl+C para salir)..."
sleep 1
sudo -u $SUDO_USER pm2 logs wled-scheduler --lines 20
