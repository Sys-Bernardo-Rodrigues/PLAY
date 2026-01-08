#!/bin/bash

# Script para remover completamente o sistema PLAY
# Execute com: sudo bash scripts/uninstall.sh
# ATENÇÃO: Este script irá remover serviços, containers e dados!

set -e

echo "⚠️  ⚠️  ⚠️  ATENÇÃO ⚠️  ⚠️  ⚠️"
echo "Este script irá remover:"
echo "  - Serviços systemd (play.service, docker-compose-play.service)"
echo "  - Containers Docker (PostgreSQL)"
echo "  - Volumes Docker (dados do banco)"
echo "  - Arquivos de configuração do sistema"
echo ""
read -p "Tem certeza que deseja continuar? (digite 'SIM' para confirmar): " -r
echo

if [[ ! $REPLY == "SIM" ]]; then
    echo "❌ Operação cancelada."
    exit 0
fi

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Por favor, execute com sudo: sudo bash scripts/uninstall.sh"
    exit 1
fi

# Detectar usuário atual e diretório do projeto
CURRENT_USER=${SUDO_USER:-$USER}
if [ "$CURRENT_USER" = "root" ]; then
    CURRENT_USER="pi"
fi
HOME_DIR="/home/$CURRENT_USER"
PROJECT_DIR="$HOME_DIR/PLAY"

# Se o diretório não existir, tentar detectar
if [ ! -d "$PROJECT_DIR" ]; then
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
fi

echo "👤 Usuário: $CURRENT_USER"
echo "📁 Projeto: $PROJECT_DIR"
echo ""

# 1. Parar e remover serviços systemd
echo "🛑 Parando serviços systemd..."

# Parar serviço PLAY
if systemctl is-active --quiet play.service 2>/dev/null; then
    echo "   Parando play.service..."
    systemctl stop play.service || true
fi

# Parar serviço docker-compose-play
if systemctl is-active --quiet docker-compose-play.service 2>/dev/null; then
    echo "   Parando docker-compose-play.service..."
    systemctl stop docker-compose-play.service || true
fi

# Desabilitar serviços
echo "   Desabilitando serviços..."
systemctl disable play.service 2>/dev/null || true
systemctl disable docker-compose-play.service 2>/dev/null || true

# Remover arquivos de serviço
echo "   Removendo arquivos de serviço..."
rm -f /etc/systemd/system/play.service
rm -f /etc/systemd/system/docker-compose-play.service
systemctl daemon-reload
echo "✅ Serviços removidos"

# 2. Parar e remover containers Docker
echo ""
echo "🐳 Parando e removendo containers Docker..."

if [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
    cd "$PROJECT_DIR" || exit 1
    
    # Parar containers
    if docker-compose ps 2>/dev/null | grep -q "Up" || docker compose ps 2>/dev/null | grep -q "Up"; then
        echo "   Parando containers..."
        docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true
    fi
    
    # Remover containers e volumes
    echo "   Removendo containers e volumes..."
    docker-compose down -v 2>/dev/null || docker compose down -v 2>/dev/null || true
    echo "✅ Containers e volumes removidos"
else
    echo "⚠️  docker-compose.yml não encontrado, tentando remover manualmente..."
    
    # Remover container manualmente se existir
    if docker ps -a | grep -q play_postgres; then
        echo "   Removendo container play_postgres..."
        docker stop play_postgres 2>/dev/null || true
        docker rm play_postgres 2>/dev/null || true
    fi
    
    # Remover volume manualmente se existir
    if docker volume ls | grep -q "play_postgres_data"; then
        echo "   Removendo volume play_postgres_data..."
        docker volume rm play_postgres_data 2>/dev/null || true
    fi
    
    # Tentar remover volume com nome padrão do docker-compose
    if docker volume ls | grep -q ".*_postgres_data"; then
        echo "   Removendo volumes relacionados..."
        docker volume ls | grep "_postgres_data" | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true
    fi
    
    echo "✅ Containers e volumes removidos"
fi

# 3. Remover script wrapper do docker-compose
echo ""
echo "🧹 Removendo scripts do sistema..."
rm -f /usr/local/bin/docker-compose-play-wrapper.sh
echo "✅ Scripts removidos"

# 4. Remover arquivos de autostart do kiosk
echo ""
echo "🖥️  Removendo configurações de autostart do kiosk..."

# Remover arquivo .desktop
if [ -f "$HOME_DIR/.config/autostart/play-kiosk.desktop" ]; then
    rm -f "$HOME_DIR/.config/autostart/play-kiosk.desktop"
    echo "✅ Arquivo play-kiosk.desktop removido"
fi

# Remover script start-kiosk.sh
if [ -f "$HOME_DIR/start-kiosk.sh" ]; then
    rm -f "$HOME_DIR/start-kiosk.sh"
    echo "✅ Script start-kiosk.sh removido"
fi

# Remover entradas dos arquivos de autostart do sistema
AUTOSTART_FILES=(
    "/etc/xdg/lxsession/LXDE-pi/autostart"
    "/etc/xdg/lxsession/LXDE/autostart"
)

for file in "${AUTOSTART_FILES[@]}"; do
    if [ -f "$file" ]; then
        if grep -q "start-kiosk.sh\|play-kiosk" "$file" 2>/dev/null; then
            echo "   Removendo entradas de $file..."
            sed -i '/start-kiosk.sh/d' "$file"
            sed -i '/play-kiosk/d' "$file"
            echo "✅ Entradas removidas de $file"
        fi
    fi
done

# 5. Remover configurações de keyring (opcional)
echo ""
read -p "Deseja remover também as configurações de keyring? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🔓 Removendo configurações de keyring..."
    
    # Remover keyring
    if [ -d "$HOME_DIR/.local/share/keyrings" ]; then
        rm -rf "$HOME_DIR/.local/share/keyrings"
        echo "✅ Keyring removido"
    fi
    
    # Remover variáveis de ambiente
    if [ -f "$HOME_DIR/.bashrc" ]; then
        sed -i '/GNOME_KEYRING_CONTROL/d' "$HOME_DIR/.bashrc" 2>/dev/null || true
        sed -i '/SSH_AUTH_SOCK/d' "$HOME_DIR/.bashrc" 2>/dev/null || true
    fi
    
    if [ -f "$HOME_DIR/.profile" ]; then
        sed -i '/GNOME_KEYRING_CONTROL/d' "$HOME_DIR/.profile" 2>/dev/null || true
        sed -i '/SSH_AUTH_SOCK/d' "$HOME_DIR/.profile" 2>/dev/null || true
    fi
    
    # Remover arquivo de autostart do keyring
    rm -f "$HOME_DIR/.config/autostart/disable-keyring.desktop" 2>/dev/null || true
    rm -f "$HOME_DIR/.chromium-browser.init" 2>/dev/null || true
    
    echo "✅ Configurações de keyring removidas"
fi

# 6. Perguntar sobre remover arquivos do projeto
echo ""
echo "📁 Arquivos do projeto: $PROJECT_DIR"
read -p "Deseja remover TODOS os arquivos do projeto? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🗑️  Removendo arquivos do projeto..."
    if [ -d "$PROJECT_DIR" ]; then
        rm -rf "$PROJECT_DIR"
        echo "✅ Diretório do projeto removido: $PROJECT_DIR"
    else
        echo "⚠️  Diretório do projeto não encontrado: $PROJECT_DIR"
    fi
else
    echo "ℹ️  Arquivos do projeto mantidos em: $PROJECT_DIR"
    echo "   Você pode removê-los manualmente se desejar"
fi

# 7. Resumo
echo ""
echo "✅ ✅ ✅ Remoção concluída! ✅ ✅ ✅"
echo ""
echo "📋 Resumo do que foi removido:"
echo "  ✅ Serviços systemd (play.service, docker-compose-play.service)"
echo "  ✅ Containers Docker"
echo "  ✅ Volumes Docker (dados do banco)"
echo "  ✅ Scripts do sistema"
echo "  ✅ Configurações de autostart do kiosk"
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "  ✅ Arquivos do projeto"
fi
echo ""
echo "💡 Para reinstalar o sistema:"
echo "   1. cd ~/PLAY (ou onde estiver o projeto)"
echo "   2. sudo bash scripts/setup-docker-autostart.sh"
echo "   3. sudo bash scripts/install-service.sh"
echo ""

