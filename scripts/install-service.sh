#!/bin/bash

# Script para instalar o serviço PLAY no Raspberry Pi
# Execute com: sudo bash scripts/install-service.sh

set -e

echo "🚀 Instalando serviço PLAY..."

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Por favor, execute com sudo: sudo bash scripts/install-service.sh"
    exit 1
fi

# Obter o diretório do projeto
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Copiar arquivo de serviço
echo "📋 Copiando arquivo de serviço..."
cp "$SCRIPT_DIR/play.service" /etc/systemd/system/play.service

# Substituir o caminho do projeto no arquivo de serviço
sed -i "s|/home/pi/PLAY|$PROJECT_DIR|g" /etc/systemd/system/play.service

# Recarregar systemd
echo "🔄 Recarregando systemd..."
systemctl daemon-reload

# Habilitar serviço
echo "✅ Habilitando serviço..."
systemctl enable play.service

echo ""
echo "✅ Serviço instalado com sucesso!"
echo ""
echo "Comandos úteis:"
echo "  Iniciar serviço:   sudo systemctl start play"
echo "  Parar serviço:     sudo systemctl stop play"
echo "  Status do serviço: sudo systemctl status play"
echo "  Ver logs:          sudo journalctl -u play -f"
echo ""

