#!/bin/bash

# Script para instalar o serviço PLAY no Raspberry Pi
# Execute com: sudo bash scripts/install-service.sh
# Compatível com Raspberry Pi OS 64-bit

set -e

echo "🚀 Instalando serviço PLAY para Raspberry Pi 4 (64-bit)..."

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Por favor, execute com sudo: sudo bash scripts/install-service.sh"
    exit 1
fi

# Detectar usuário atual
CURRENT_USER=${SUDO_USER:-$USER}
if [ "$CURRENT_USER" = "root" ]; then
    CURRENT_USER="pi"
fi

echo "👤 Usuário detectado: $CURRENT_USER"

# Obter o diretório do projeto
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📁 Diretório do projeto: $PROJECT_DIR"

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instalando npm..."
    apt-get install -y npm
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo "✅ Node.js: $NODE_VERSION"
echo "✅ npm: $NPM_VERSION"

# Verificar se o diretório do projeto existe
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Diretório do projeto não encontrado: $PROJECT_DIR"
    exit 1
fi

# Verificar se package.json existe
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo "❌ package.json não encontrado em $PROJECT_DIR"
    exit 1
fi

# Encontrar o caminho completo do node e npm
NODE_PATH=$(which node)
NPM_PATH=$(which npm)

echo "📍 Node.js path: $NODE_PATH"
echo "📍 npm path: $NPM_PATH"

# Copiar arquivo de serviço
echo "📋 Copiando arquivo de serviço..."
cp "$SCRIPT_DIR/play.service" /etc/systemd/system/play.service

# Substituir variáveis no arquivo de serviço
sed -i "s|/home/pi/PLAY|$PROJECT_DIR|g" /etc/systemd/system/play.service
sed -i "s|User=pi|User=$CURRENT_USER|g" /etc/systemd/system/play.service
sed -i "s|/usr/bin/npm|$NPM_PATH|g" /etc/systemd/system/play.service

# Verificar se PostgreSQL está rodando (opcional, apenas aviso)
if ! systemctl is-active --quiet postgresql 2>/dev/null; then
    echo "⚠️  PostgreSQL não está rodando. Certifique-se de que o Docker está configurado."
fi

# Recarregar systemd
echo "🔄 Recarregando systemd..."
systemctl daemon-reload

# Habilitar serviço
echo "✅ Habilitando serviço..."
systemctl enable play.service

echo ""
echo "✅ Serviço instalado com sucesso!"
echo ""
echo "📋 Informações do serviço:"
echo "  - Usuário: $CURRENT_USER"
echo "  - Diretório: $PROJECT_DIR"
echo "  - Node.js: $NODE_PATH"
echo "  - npm: $NPM_PATH"
echo ""
echo "🔧 Comandos úteis:"
echo "  Iniciar serviço:   sudo systemctl start play"
echo "  Parar serviço:     sudo systemctl stop play"
echo "  Reiniciar serviço: sudo systemctl restart play"
echo "  Status do serviço: sudo systemctl status play"
echo "  Ver logs:          sudo journalctl -u play -f"
echo "  Ver últimos logs:  sudo journalctl -u play -n 50"
echo ""
echo "🧪 Para testar o serviço:"
echo "  sudo systemctl start play"
echo "  sudo systemctl status play"
echo ""

