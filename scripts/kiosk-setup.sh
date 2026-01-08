#!/bin/bash

# Script para configurar o Raspberry Pi para iniciar o player em modo quiosque
# Execute com: sudo bash scripts/kiosk-setup.sh

set -e

echo "🖥️  Configurando modo quiosque..."

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Por favor, execute com sudo: sudo bash scripts/kiosk-setup.sh"
    exit 1
fi

# Instalar dependências necessárias
echo "📦 Instalando dependências..."
apt-get update
apt-get install -y unclutter xdotool chromium-browser

# Criar diretório de autostart
AUTOSTART_DIR="/home/pi/.config/autostart"
mkdir -p "$AUTOSTART_DIR"

# Criar arquivo .desktop para autostart
echo "📝 Criando arquivo de autostart..."
cat > "$AUTOSTART_DIR/play-kiosk.desktop" << 'EOF'
[Desktop Entry]
Type=Application
Name=PLAY Kiosk
Exec=chromium-browser --kiosk --disable-infobars --disable-session-crashed-bubble --noerrdialogs --disable-restore-session-state --app=http://localhost:3000/kiosk
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF

# Criar script de inicialização
echo "📝 Criando script de inicialização..."
cat > /home/pi/start-kiosk.sh << 'EOF'
#!/bin/bash

# Aguardar o serviço PLAY iniciar
sleep 10

# Desabilitar screensaver
xset s off
xset -dpms
xset s noblank

# Esconder cursor
unclutter -idle 0.5 -root &

# Abrir navegador em modo quiosque na página dedicada
chromium-browser \
  --kiosk \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --noerrdialogs \
  --disable-restore-session-state \
  --app=http://localhost:3000/kiosk &

# Manter script rodando
wait
EOF

chmod +x /home/pi/start-kiosk.sh

# Configurar para iniciar no boot (se usando LXDE)
if [ -f "/etc/xdg/lxsession/LXDE-pi/autostart" ]; then
    echo "@/home/pi/start-kiosk.sh" >> /etc/xdg/lxsession/LXDE-pi/autostart
fi

# Configurar para iniciar no boot (se usando X11)
if [ -f "/etc/xdg/lxsession/LXDE/autostart" ]; then
    echo "@/home/pi/start-kiosk.sh" >> /etc/xdg/lxsession/LXDE/autostart
fi

echo ""
echo "✅ Modo quiosque configurado com sucesso!"
echo ""
echo "O sistema irá:"
echo "  - Iniciar o serviço PLAY automaticamente"
echo "  - Abrir o navegador em modo quiosque ao iniciar"
echo "  - Ocultar o cursor após 0.5 segundos de inatividade"
echo "  - Desabilitar screensaver"
echo ""
echo "Para testar, reinicie o Raspberry Pi:"
echo "  sudo reboot"
echo ""

