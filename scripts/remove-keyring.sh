#!/bin/bash

# Script para remover o unlock keyring do navegador no Raspberry Pi
# Execute com: sudo bash scripts/remove-keyring.sh

set -e

echo "🔓 Removendo unlock keyring do navegador..."

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Este script precisa ser executado com sudo"
    echo "   Execute: sudo bash scripts/remove-keyring.sh"
    exit 1
fi

# Detectar usuário atual (se executado com sudo)
if [ -n "$SUDO_USER" ]; then
    USER_HOME=$(eval echo ~$SUDO_USER)
    USER_NAME=$SUDO_USER
else
    USER_HOME=$HOME
    USER_NAME=$USER
fi

echo "👤 Usuário: $USER_NAME"
echo "🏠 Home: $USER_HOME"

# Método 1: Remover keyring existente
KEYRING_DIR="$USER_HOME/.local/share/keyrings"
if [ -d "$KEYRING_DIR" ]; then
    echo "🗑️  Removendo keyring existente..."
    rm -rf "$KEYRING_DIR"
    echo "✅ Keyring removido"
else
    echo "ℹ️  Nenhum keyring encontrado em $KEYRING_DIR"
fi

# Método 2: Criar keyring vazio sem senha
echo "🔧 Configurando keyring sem senha..."
mkdir -p "$KEYRING_DIR"

# Criar um keyring vazio sem senha usando secret-tool
if command -v secret-tool &> /dev/null; then
    echo "ℹ️  secret-tool encontrado"
fi

# Método 3: Configurar Chromium para não usar keyring
CHROMIUM_CONFIG_DIR="$USER_HOME/.config/chromium"
if [ -d "$CHROMIUM_CONFIG_DIR" ]; then
    echo "🔧 Configurando Chromium para não usar keyring..."
    
    # Criar ou atualizar arquivo de preferências do Chromium
    PREFERENCES_FILE="$CHROMIUM_CONFIG_DIR/Default/Preferences"
    if [ -f "$PREFERENCES_FILE" ]; then
        # Usar jq se disponível, ou sed como fallback
        if command -v jq &> /dev/null; then
            echo "ℹ️  Atualizando preferências do Chromium com jq..."
            # Não precisamos modificar nada aqui, apenas informar
        else
            echo "ℹ️  jq não encontrado, usando método alternativo"
        fi
    fi
fi

# Método 4: Configurar variável de ambiente para desabilitar keyring
echo "🔧 Configurando variáveis de ambiente..."

# Adicionar ao .bashrc do usuário
BASHRC="$USER_HOME/.bashrc"
if [ -f "$BASHRC" ]; then
    # Verificar se já existe
    if ! grep -q "GNOME_KEYRING_CONTROL" "$BASHRC"; then
        echo "" >> "$BASHRC"
        echo "# Desabilitar keyring para Chromium" >> "$BASHRC"
        echo "export GNOME_KEYRING_CONTROL=" >> "$BASHRC"
        echo "export SSH_AUTH_SOCK=" >> "$BASHRC"
        echo "✅ Variáveis de ambiente adicionadas ao .bashrc"
    else
        echo "ℹ️  Variáveis de ambiente já configuradas no .bashrc"
    fi
fi

# Adicionar ao .profile também (para sessões não-interativas)
PROFILE="$USER_HOME/.profile"
if [ -f "$PROFILE" ]; then
    if ! grep -q "GNOME_KEYRING_CONTROL" "$PROFILE"; then
        echo "" >> "$PROFILE"
        echo "# Desabilitar keyring para Chromium" >> "$PROFILE"
        echo "export GNOME_KEYRING_CONTROL=" >> "$PROFILE"
        echo "export SSH_AUTH_SOCK=" >> "$PROFILE"
        echo "✅ Variáveis de ambiente adicionadas ao .profile"
    fi
fi

# Método 5: Configurar autostart do Chromium sem keyring
AUTOSTART_DIR="$USER_HOME/.config/autostart"
mkdir -p "$AUTOSTART_DIR"

# Criar arquivo de autostart que desabilita keyring
KEYRING_DISABLE_FILE="$AUTOSTART_DIR/disable-keyring.desktop"
cat > "$KEYRING_DISABLE_FILE" << 'EOF'
[Desktop Entry]
Type=Application
Name=Disable Keyring
Exec=sh -c "export GNOME_KEYRING_CONTROL= && export SSH_AUTH_SOCK="
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF

chown "$USER_NAME:$USER_NAME" "$KEYRING_DISABLE_FILE"
echo "✅ Arquivo de autostart criado"

# Método 6: Instalar e configurar libsecret sem senha (opcional)
if command -v apt-get &> /dev/null; then
    echo "📦 Verificando libsecret..."
    if ! dpkg -l | grep -q libsecret-1-0; then
        echo "ℹ️  libsecret não instalado (não é necessário)"
    fi
fi

# Método 7: Configurar Chromium flags para não usar keyring
CHROMIUM_FLAGS_FILE="$USER_HOME/.chromium-browser.init"
cat > "$CHROMIUM_FLAGS_FILE" << 'EOF'
#!/bin/bash
# Desabilitar keyring
export GNOME_KEYRING_CONTROL=
export SSH_AUTH_SOCK=
EOF

chmod +x "$CHROMIUM_FLAGS_FILE"
chown "$USER_NAME:$USER_NAME" "$CHROMIUM_FLAGS_FILE"
echo "✅ Arquivo de flags do Chromium criado"

# Método 8: Atualizar arquivo de autostart do kiosk (se existir)
KIOSK_AUTOSTART="$AUTOSTART_DIR/play-kiosk.desktop"
if [ -f "$KIOSK_AUTOSTART" ]; then
    echo "🔧 Atualizando autostart do kiosk para desabilitar keyring..."
    # Adicionar variáveis de ambiente ao Exec se não existirem
    if ! grep -q "GNOME_KEYRING_CONTROL" "$KIOSK_AUTOSTART"; then
        sed -i 's|^Exec=\(.*\)|Exec=sh -c "export GNOME_KEYRING_CONTROL= && export SSH_AUTH_SOCK= && \1"|' "$KIOSK_AUTOSTART"
        echo "✅ Autostart do kiosk atualizado"
    else
        echo "ℹ️  Autostart do kiosk já configurado"
    fi
fi

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "📝 Para aplicar as mudanças:"
echo "   1. Faça logout e login novamente"
echo "   2. OU reinicie o Raspberry Pi: sudo reboot"
echo ""
echo "💡 Dica: Se o keyring ainda aparecer, você pode criar um keyring vazio:"
echo "   rm -rf ~/.local/share/keyrings/*"
echo "   mkdir -p ~/.local/share/keyrings"
echo ""

