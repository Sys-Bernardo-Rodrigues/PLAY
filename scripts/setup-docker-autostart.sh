#!/bin/bash

# Script para configurar Docker e containers para iniciar automaticamente
# Execute com: sudo bash scripts/setup-docker-autostart.sh

set -e

echo "🐳 Configurando Docker para iniciar automaticamente..."

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Por favor, execute com sudo: sudo bash scripts/setup-docker-autostart.sh"
    exit 1
fi

# Detectar usuário atual e diretório do projeto
CURRENT_USER=${SUDO_USER:-$USER}
if [ "$CURRENT_USER" = "root" ]; then
    CURRENT_USER="pi"
fi
HOME_DIR="/home/$CURRENT_USER"
PROJECT_DIR="$HOME_DIR/PLAY"

# Verificar se o diretório do projeto existe
if [ ! -d "$PROJECT_DIR" ]; then
    echo "⚠️  Diretório do projeto não encontrado: $PROJECT_DIR"
    echo "   Por favor, ajuste o caminho no script ou crie o diretório."
    read -p "   Continuar mesmo assim? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

echo "👤 Usuário: $CURRENT_USER"
echo "📁 Projeto: $PROJECT_DIR"

# 1. Habilitar Docker para iniciar no boot
echo ""
echo "🔧 Habilitando serviço Docker..."
systemctl enable docker
systemctl start docker
echo "✅ Docker habilitado para iniciar no boot"

# 2. Verificar se docker-compose está instalado
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "📦 Instalando docker-compose..."
    apt-get update
    apt-get install -y docker-compose || {
        # Tentar instalar via pip se apt não funcionar
        apt-get install -y python3-pip
        pip3 install docker-compose
    }
fi

# 3. Adicionar restart: always ao docker-compose.yml
if [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
    echo ""
    echo "🔧 Atualizando docker-compose.yml para restart automático..."
    
    # Remover linhas duplicadas de "restart: always" (manter apenas a primeira)
    if grep -q "restart: always" "$PROJECT_DIR/docker-compose.yml"; then
        # Contar quantas vezes aparece
        RESTART_COUNT=$(grep -c "restart: always" "$PROJECT_DIR/docker-compose.yml" || echo "0")
        if [ "$RESTART_COUNT" -gt 1 ]; then
            echo "⚠️  Encontradas $RESTART_COUNT linhas 'restart: always'. Removendo duplicatas..."
            # Remover todas as linhas com "restart: always" e adicionar apenas uma após "postgres:"
            sed -i '/restart: always/d' "$PROJECT_DIR/docker-compose.yml"
            sed -i '/postgres:/a\    restart: always' "$PROJECT_DIR/docker-compose.yml"
            echo "✅ Duplicatas removidas e restart: always adicionado corretamente"
        else
            echo "ℹ️  docker-compose.yml já tem restart: always configurado corretamente"
        fi
    else
        # Adicionar restart: always ao serviço postgres
        sed -i '/postgres:/a\    restart: always' "$PROJECT_DIR/docker-compose.yml"
        echo "✅ restart: always adicionado ao docker-compose.yml"
    fi
else
    echo "⚠️  docker-compose.yml não encontrado em $PROJECT_DIR"
fi

# 4. Adicionar usuário ao grupo docker (se necessário)
echo ""
echo "🔧 Verificando permissões do Docker..."
if ! groups "$CURRENT_USER" | grep -q docker; then
    echo "   Adicionando usuário $CURRENT_USER ao grupo docker..."
    usermod -aG docker "$CURRENT_USER"
    echo "✅ Usuário adicionado ao grupo docker"
    echo "⚠️  Nota: O usuário precisa fazer logout/login para as permissões terem efeito"
else
    echo "✅ Usuário já está no grupo docker"
fi

# 5. Criar serviço systemd para iniciar docker-compose
echo ""
echo "🔧 Criando serviço systemd para docker-compose..."

# Encontrar caminho do docker e docker-compose
DOCKER_PATH=$(which docker)
if [ -z "$DOCKER_PATH" ]; then
    DOCKER_PATH="/usr/bin/docker"
fi

# Verificar qual versão do docker-compose está disponível
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_PATH=$(which docker-compose)
    DOCKER_COMPOSE_CMD="$DOCKER_COMPOSE_PATH"
    echo "✅ Usando docker-compose: $DOCKER_COMPOSE_PATH"
elif docker compose version &> /dev/null; then
    # Docker Compose V2 (plugin)
    DOCKER_COMPOSE_CMD="$DOCKER_PATH compose"
    echo "✅ Usando docker compose (V2)"
else
    echo "❌ docker-compose não encontrado"
    echo "   Tentando instalar docker-compose..."
    apt-get update
    apt-get install -y docker-compose || {
        echo "❌ Falha ao instalar docker-compose"
        exit 1
    }
    DOCKER_COMPOSE_PATH=$(which docker-compose)
    DOCKER_COMPOSE_CMD="$DOCKER_COMPOSE_PATH"
fi

# Criar script wrapper para executar docker-compose
WRAPPER_SCRIPT="/usr/local/bin/docker-compose-play-wrapper.sh"
cat > "$WRAPPER_SCRIPT" << SCRIPT_EOF
#!/bin/bash
cd "$PROJECT_DIR" || exit 1

# Detectar qual comando docker-compose usar
if command -v docker-compose &> /dev/null; then
    # Docker Compose V1
    docker-compose "\$@"
elif docker compose version &> /dev/null 2>&1; then
    # Docker Compose V2
    docker compose "\$@"
else
    echo "Erro: docker-compose não encontrado" >&2
    exit 1
fi
SCRIPT_EOF

chmod +x "$WRAPPER_SCRIPT"
echo "✅ Script wrapper criado: $WRAPPER_SCRIPT"

# Criar arquivo de serviço
cat > /etc/systemd/system/docker-compose-play.service << EOF
[Unit]
Description=Docker Compose for PLAY PostgreSQL
Requires=docker.service
After=docker.service network.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
User=$CURRENT_USER
Group=$CURRENT_USER
ExecStart=$WRAPPER_SCRIPT up -d
ExecStop=$WRAPPER_SCRIPT down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

# Recarregar systemd e habilitar serviço
systemctl daemon-reload
systemctl enable docker-compose-play.service

# Tentar iniciar o serviço
echo "🚀 Iniciando serviço docker-compose-play..."
if systemctl start docker-compose-play.service; then
    echo "✅ Serviço docker-compose-play iniciado com sucesso"
else
    echo "⚠️  Erro ao iniciar serviço. Verificando logs..."
    systemctl status docker-compose-play.service --no-pager -l || true
    echo ""
    echo "💡 Tentando iniciar manualmente para diagnóstico..."
    cd "$PROJECT_DIR"
    sudo -u "$CURRENT_USER" $DOCKER_COMPOSE_CMD up -d || {
        echo "❌ Erro ao iniciar containers manualmente"
        echo "   Verifique se o Docker está funcionando: sudo systemctl status docker"
        echo "   Verifique permissões: sudo usermod -aG docker $CURRENT_USER"
    }
fi

# 6. Verificar se o container está rodando
echo ""
echo "⏳ Aguardando container iniciar..."
sleep 5

if docker ps | grep -q play_postgres; then
    echo "✅ Container PostgreSQL está rodando"
else
    echo "⚠️  Container PostgreSQL não está rodando. Verificando logs..."
    systemctl status docker-compose-play.service --no-pager -l
    echo ""
    echo "💡 Tente iniciar manualmente:"
    echo "   cd $PROJECT_DIR"
    echo "   docker-compose up -d"
fi

# 7. Atualizar play.service para depender do docker-compose-play
if [ -f "$PROJECT_DIR/scripts/play.service" ]; then
    echo ""
    echo "🔧 Atualizando play.service para depender do docker-compose-play..."
    
    # Verificar se já tem a dependência
    if ! grep -q "docker-compose-play.service" "$PROJECT_DIR/scripts/play.service"; then
        # Adicionar docker-compose-play.service às dependências
        sed -i 's/After=network.target postgresql.service docker.service/After=network.target docker.service docker-compose-play.service/' "$PROJECT_DIR/scripts/play.service"
        sed -i '/Wants=postgresql.service/a Wants=docker-compose-play.service' "$PROJECT_DIR/scripts/play.service"
        echo "✅ play.service atualizado"
        
        # Se o serviço já estiver instalado, reinstalar
        if systemctl list-unit-files | grep -q "play.service"; then
            echo "🔄 Reinstalando serviço play..."
            systemctl stop play.service 2>/dev/null || true
            cp "$PROJECT_DIR/scripts/play.service" /etc/systemd/system/play.service
            systemctl daemon-reload
            systemctl enable play.service
            systemctl start play.service
            echo "✅ Serviço play reinstalado"
        fi
    else
        echo "ℹ️  play.service já tem dependência do docker-compose-play"
    fi
fi

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "📝 Serviços configurados:"
echo "   - docker.service (habilitado para iniciar no boot)"
echo "   - docker-compose-play.service (inicia containers automaticamente)"
echo ""
echo "📋 Comandos úteis:"
echo "   Ver status: sudo systemctl status docker-compose-play"
echo "   Ver logs: sudo journalctl -u docker-compose-play -f"
echo "   Reiniciar: sudo systemctl restart docker-compose-play"
echo ""
echo "🔄 Reinicie o Raspberry Pi para testar:"
echo "   sudo reboot"
echo ""

