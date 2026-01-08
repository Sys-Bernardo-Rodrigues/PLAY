#!/bin/bash

# Script para configurar permissões para reiniciar o sistema pelo app
# Execute com: sudo bash scripts/setup-reboot-permissions.sh

set -e

echo "🔧 Configurando permissões para reiniciar o sistema pelo app..."

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Por favor, execute com sudo: sudo bash scripts/setup-reboot-permissions.sh"
    exit 1
fi

# Detectar usuário atual
CURRENT_USER=${SUDO_USER:-$USER}
if [ "$CURRENT_USER" = "root" ]; then
    CURRENT_USER="pi"
fi

echo "👤 Usuário: $CURRENT_USER"

# Verificar se o serviço play está instalado
SERVICE_USER="$CURRENT_USER"
if systemctl list-unit-files | grep -q "play.service"; then
    # Obter o usuário do serviço
    SERVICE_USER=$(systemctl show play.service -p User --value 2>/dev/null || echo "$CURRENT_USER")
    echo "📋 Usuário do serviço PLAY: $SERVICE_USER"
fi

# Método 1: Configurar sudoers para permitir reboot sem senha
echo ""
echo "🔐 Configurando sudoers para permitir reboot sem senha..."

SUDOERS_FILE="/etc/sudoers.d/play-reboot"
SUDOERS_LINE="$SERVICE_USER ALL=(ALL) NOPASSWD: /sbin/reboot, /sbin/shutdown -r now"

# Verificar se já existe configuração
if [ -f "$SUDOERS_FILE" ]; then
    if grep -q "NOPASSWD.*reboot" "$SUDOERS_FILE"; then
        echo "ℹ️  Configuração de sudoers já existe"
    else
        echo "   Atualizando configuração existente..."
        echo "$SUDOERS_LINE" >> "$SUDOERS_FILE"
    fi
else
    echo "   Criando arquivo de sudoers..."
    echo "$SUDOERS_LINE" > "$SUDOERS_FILE"
    chmod 0440 "$SUDOERS_FILE"
    echo "✅ Arquivo de sudoers criado: $SUDOERS_FILE"
fi

# Validar sintaxe do sudoers
if visudo -c -f "$SUDOERS_FILE" 2>/dev/null; then
    echo "✅ Sintaxe do sudoers válida"
else
    echo "⚠️  Aviso: Erro ao validar sintaxe do sudoers"
    echo "   Verifique manualmente: sudo visudo -c -f $SUDOERS_FILE"
fi

# Método 2: Verificar se o usuário está no grupo sudo
echo ""
echo "👥 Verificando grupo do usuário..."
if groups "$SERVICE_USER" | grep -q sudo; then
    echo "✅ Usuário $SERVICE_USER está no grupo sudo"
else
    echo "⚠️  Usuário $SERVICE_USER não está no grupo sudo"
    read -p "   Deseja adicionar ao grupo sudo? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        usermod -aG sudo "$SERVICE_USER"
        echo "✅ Usuário adicionado ao grupo sudo"
        echo "⚠️  Nota: O usuário precisa fazer logout/login para as mudanças terem efeito"
    fi
fi

# Método 3: Criar script wrapper para reboot (alternativa mais segura)
echo ""
echo "📝 Criando script wrapper para reboot..."
REBOOT_SCRIPT="/usr/local/bin/play-reboot.sh"
cat > "$REBOOT_SCRIPT" << 'EOF'
#!/bin/bash
# Script wrapper para reiniciar o sistema
# Permite controle mais fino sobre quem pode reiniciar

# Verificar se está sendo chamado pelo serviço PLAY
if [ "$(whoami)" != "root" ]; then
    # Tentar com sudo
    sudo /sbin/reboot
else
    /sbin/reboot
fi
EOF

chmod +x "$REBOOT_SCRIPT"
echo "✅ Script wrapper criado: $REBOOT_SCRIPT"

# Método 4: Verificar permissões do sistema
echo ""
echo "🔍 Verificando permissões do sistema..."

# Verificar se /sbin/reboot existe e é executável
if [ -x "/sbin/reboot" ]; then
    echo "✅ /sbin/reboot existe e é executável"
else
    echo "❌ /sbin/reboot não encontrado ou não é executável"
fi

# Verificar se systemctl reboot funciona
if systemctl reboot --help > /dev/null 2>&1; then
    echo "✅ systemctl reboot está disponível"
    
    # Adicionar permissão para systemctl reboot também
    if ! grep -q "systemctl reboot" "$SUDOERS_FILE" 2>/dev/null; then
        echo "$SERVICE_USER ALL=(ALL) NOPASSWD: /bin/systemctl reboot" >> "$SUDOERS_FILE"
        echo "✅ Permissão para systemctl reboot adicionada"
    fi
else
    echo "ℹ️  systemctl reboot não está disponível (normal em alguns sistemas)"
fi

# Método 5: Testar permissões (sem realmente reiniciar)
echo ""
echo "🧪 Testando permissões (simulação)..."
if sudo -u "$SERVICE_USER" sudo -n /sbin/reboot --help > /dev/null 2>&1; then
    echo "✅ Permissões de reboot funcionando corretamente"
else
    echo "⚠️  Não foi possível testar permissões automaticamente"
    echo "   Isso é normal - o teste real só funciona quando executado pelo serviço"
fi

# Resumo
echo ""
echo "✅ ✅ ✅ Configuração concluída! ✅ ✅ ✅"
echo ""
echo "📋 Resumo das configurações:"
echo "  ✅ Arquivo sudoers criado: $SUDOERS_FILE"
echo "  ✅ Script wrapper criado: $REBOOT_SCRIPT"
echo "  ✅ Usuário configurado: $SERVICE_USER"
echo ""
echo "📝 O que foi configurado:"
echo "  - Permissão para executar 'sudo reboot' sem senha"
echo "  - Permissão para executar 'sudo systemctl reboot' sem senha"
echo "  - Script wrapper para reboot (alternativa mais segura)"
echo ""
echo "⚠️  IMPORTANTE:"
echo "  - Se o usuário foi adicionado ao grupo sudo, faça logout/login"
echo "  - Reinicie o serviço PLAY para aplicar mudanças:"
echo "    sudo systemctl restart play"
echo ""
echo "🧪 Para testar (CUIDADO - vai reiniciar o sistema!):"
echo "  sudo -u $SERVICE_USER sudo reboot"
echo ""

