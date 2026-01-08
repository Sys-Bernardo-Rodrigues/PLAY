#!/bin/bash

# Script para corrigir problemas comuns no modo quiosque
# Execute com: sudo bash scripts/fix-kiosk.sh

set -e

echo "🔧 Corrigindo problemas do modo quiosque..."

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Por favor, execute com sudo: sudo bash scripts/fix-kiosk.sh"
    exit 1
fi

# Detectar usuário atual
CURRENT_USER=${SUDO_USER:-$USER}
if [ "$CURRENT_USER" = "root" ]; then
    CURRENT_USER="pi"
fi
HOME_DIR="/home/$CURRENT_USER"

echo "👤 Usuário: $CURRENT_USER"
echo "📁 Home: $HOME_DIR"

# Verificar e corrigir permissões
echo "🔐 Corrigindo permissões..."
chown -R "$CURRENT_USER:$CURRENT_USER" "$HOME_DIR/.config" 2>/dev/null || true
chmod +x "$HOME_DIR/start-kiosk.sh" 2>/dev/null || true

# Verificar se o serviço PLAY está rodando
echo "🔍 Verificando serviço PLAY..."
if systemctl is-active --quiet play; then
    echo "✅ Serviço PLAY está rodando"
else
    echo "⚠️  Serviço PLAY não está rodando. Iniciando..."
    systemctl start play || echo "❌ Erro ao iniciar serviço PLAY"
fi

# Verificar se o servidor está respondendo
echo "🌐 Verificando se o servidor está respondendo..."
for i in {1..10}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Servidor está respondendo"
        break
    else
        echo "⏳ Aguardando servidor... ($i/10)"
        sleep 2
    fi
done

# Verificar processos do Chromium
echo "🔍 Verificando processos do Chromium..."
pkill -f chromium || true
sleep 2

# Testar abertura do kiosk manualmente
echo "🧪 Testando abertura do kiosk..."
export DISPLAY=:0
sudo -u "$CURRENT_USER" DISPLAY=:0 "$HOME_DIR/start-kiosk.sh" &
sleep 5

echo ""
echo "✅ Correções aplicadas!"
echo ""
echo "📝 Para verificar:"
echo "  - Serviço: sudo systemctl status play"
echo "  - Logs: sudo journalctl -u play -f"
echo "  - Processos: ps aux | grep chromium"
echo ""

