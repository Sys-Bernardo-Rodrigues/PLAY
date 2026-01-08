#!/bin/bash

# Script para configurar o Raspberry Pi para iniciar o player em modo quiosque
# Execute com: sudo bash scripts/kiosk-setup.sh
# Compatível com Raspberry Pi OS 64-bit

set -e

echo "🖥️  Configurando modo quiosque para Raspberry Pi 4 (64-bit)..."

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Por favor, execute com sudo: sudo bash scripts/kiosk-setup.sh"
    exit 1
fi

# Detectar usuário atual (não necessariamente "pi")
CURRENT_USER=${SUDO_USER:-$USER}
if [ "$CURRENT_USER" = "root" ]; then
    CURRENT_USER="pi"
fi
HOME_DIR="/home/$CURRENT_USER"

echo "👤 Usuário detectado: $CURRENT_USER"
echo "📁 Diretório home: $HOME_DIR"

# Instalar dependências necessárias
echo "📦 Instalando dependências..."
apt-get update
apt-get install -y unclutter xdotool x11-xserver-utils

# Detectar qual navegador Chromium está disponível
if command -v chromium-browser &> /dev/null; then
    CHROMIUM_CMD="chromium-browser"
elif command -v chromium &> /dev/null; then
    CHROMIUM_CMD="chromium"
else
    echo "📦 Instalando Chromium..."
    apt-get install -y chromium-browser || apt-get install -y chromium
    if command -v chromium-browser &> /dev/null; then
        CHROMIUM_CMD="chromium-browser"
    else
        CHROMIUM_CMD="chromium"
    fi
fi

echo "🌐 Navegador detectado: $CHROMIUM_CMD"

# Criar diretório de autostart
AUTOSTART_DIR="$HOME_DIR/.config/autostart"
mkdir -p "$AUTOSTART_DIR"
chown -R "$CURRENT_USER:$CURRENT_USER" "$HOME_DIR/.config"

# Criar arquivo .desktop para autostart
echo "📝 Criando arquivo de autostart..."
cat > "$AUTOSTART_DIR/play-kiosk.desktop" << EOF
[Desktop Entry]
Type=Application
Name=PLAY Kiosk
Exec=$CHROMIUM_CMD --kiosk --disable-infobars --disable-session-crashed-bubble --noerrdialogs --disable-restore-session-state --autoplay-policy=no-user-gesture-required --app=http://localhost:3000/kiosk
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF

chown "$CURRENT_USER:$CURRENT_USER" "$AUTOSTART_DIR/play-kiosk.desktop"

# Criar script de inicialização
echo "📝 Criando script de inicialização..."
cat > "$HOME_DIR/start-kiosk.sh" << EOF
#!/bin/bash

# Aguardar o serviço PLAY iniciar e o X server estar pronto
echo "Aguardando X server estar pronto..."
sleep 10

# Aguardar até que o serviço PLAY esteja respondendo e a página kiosk esteja acessível
echo "Aguardando servidor PLAY estar pronto..."
MAX_WAIT=120  # 2 minutos máximo
WAIT_TIME=0

while [ \$WAIT_TIME -lt \$MAX_WAIT ]; do
    # Verificar se a página principal responde
    if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
        # Verificar se a página kiosk responde (pode retornar erro mas deve responder)
        if curl -s -f http://localhost:3000/kiosk > /dev/null 2>&1 || curl -s http://localhost:3000/kiosk > /dev/null 2>&1; then
            echo "Servidor está pronto!"
            break
        fi
    fi
    sleep 3
    WAIT_TIME=\$((WAIT_TIME + 3))
    echo "Aguardando servidor... (\$WAIT_TIME/\$MAX_WAIT segundos)"
done

# Aguardar mais um pouco para garantir que está totalmente estável
sleep 5

# Desabilitar screensaver e power management
export DISPLAY=:0
xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true
xset s noblank 2>/dev/null || true

# Esconder cursor após 0.5 segundos de inatividade
unclutter -idle 0.5 -root &

# Abrir navegador em modo quiosque na página dedicada
echo "Abrindo navegador em modo kiosk..."
$CHROMIUM_CMD \\
  --kiosk \\
  --disable-infobars \\
  --disable-session-crashed-bubble \\
  --noerrdialogs \\
  --disable-restore-session-state \\
  --autoplay-policy=no-user-gesture-required \\
  --disable-features=TranslateUI \\
  --disable-ipc-flooding-protection \\
  --disable-background-networking \\
  --disable-default-apps \\
  --disable-sync \\
  --no-first-run \\
  --disable-extensions \\
  --disable-plugins-discovery \\
  --disable-preconnect \\
  --media-cache-size=0 \\
  --disk-cache-size=0 \\
  --app=http://localhost:3000/kiosk &

# Manter script rodando
wait
EOF

chmod +x "$HOME_DIR/start-kiosk.sh"
chown "$CURRENT_USER:$CURRENT_USER" "$HOME_DIR/start-kiosk.sh"

# Configurar para iniciar no boot (múltiplas opções para compatibilidade)
echo "⚙️  Configurando autostart..."

# Opção 1: LXDE-pi (Raspberry Pi OS antigo)
if [ -d "/etc/xdg/lxsession/LXDE-pi" ]; then
    if ! grep -q "start-kiosk.sh" /etc/xdg/lxsession/LXDE-pi/autostart 2>/dev/null; then
        echo "@$HOME_DIR/start-kiosk.sh" >> /etc/xdg/lxsession/LXDE-pi/autostart
        echo "✅ Configurado em /etc/xdg/lxsession/LXDE-pi/autostart"
    fi
fi

# Opção 2: LXDE (Raspberry Pi OS novo)
if [ -d "/etc/xdg/lxsession/LXDE" ]; then
    if ! grep -q "start-kiosk.sh" /etc/xdg/lxsession/LXDE/autostart 2>/dev/null; then
        echo "@$HOME_DIR/start-kiosk.sh" >> /etc/xdg/lxsession/LXDE/autostart
        echo "✅ Configurado em /etc/xdg/lxsession/LXDE/autostart"
    fi
fi

# Opção 3: XFCE (algumas versões)
if [ -d "/etc/xdg/autostart" ]; then
    cp "$AUTOSTART_DIR/play-kiosk.desktop" /etc/xdg/autostart/ 2>/dev/null || true
    echo "✅ Configurado em /etc/xdg/autostart"
fi

# Opção 4: .bashrc como fallback (se nenhum dos anteriores funcionar)
if [ ! -f "$HOME_DIR/.config/autostart/play-kiosk.desktop" ] && [ ! -f "/etc/xdg/lxsession/LXDE-pi/autostart" ] && [ ! -f "/etc/xdg/lxsession/LXDE/autostart" ]; then
    if ! grep -q "start-kiosk.sh" "$HOME_DIR/.bashrc" 2>/dev/null; then
        echo "" >> "$HOME_DIR/.bashrc"
        echo "# PLAY Kiosk Mode" >> "$HOME_DIR/.bashrc"
        echo "if [ -z \"\$DISPLAY\" ] && [ \"\$(tty)\" = \"/dev/tty1\" ]; then" >> "$HOME_DIR/.bashrc"
        echo "    sleep 5 && $HOME_DIR/start-kiosk.sh &" >> "$HOME_DIR/.bashrc"
        echo "fi" >> "$HOME_DIR/.bashrc"
        echo "✅ Configurado como fallback em .bashrc"
    fi
fi

# Configurar permissões
chown -R "$CURRENT_USER:$CURRENT_USER" "$HOME_DIR/.config" 2>/dev/null || true

echo ""
echo "✅ Modo quiosque configurado com sucesso!"
echo ""
echo "📋 Configurações aplicadas:"
echo "  - Usuário: $CURRENT_USER"
echo "  - Navegador: $CHROMIUM_CMD"
echo "  - Script: $HOME_DIR/start-kiosk.sh"
echo "  - Autostart: $AUTOSTART_DIR/play-kiosk.desktop"
echo ""
echo "🎯 O sistema irá:"
echo "  - Aguardar o serviço PLAY iniciar (15 segundos)"
echo "  - Verificar se o servidor está respondendo"
echo "  - Abrir o navegador em modo quiosque"
echo "  - Ocultar o cursor após 0.5 segundos de inatividade"
echo "  - Desabilitar screensaver e power management"
echo ""
echo "🧪 Para testar manualmente:"
echo "  $HOME_DIR/start-kiosk.sh"
echo ""
echo "🔄 Para aplicar as mudanças, reinicie o Raspberry Pi:"
echo "  sudo reboot"
echo ""
echo "📝 Para verificar logs do serviço PLAY:"
echo "  sudo journalctl -u play -f"
echo ""

