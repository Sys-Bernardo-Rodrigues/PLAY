#!/bin/bash

# Script para configurar o ambiente no Raspberry Pi
# Execute com: bash scripts/setup-raspberry.sh

# Não usar set -e para permitir tratamento de erros

echo "🚀 Configurando ambiente PLAY no Raspberry Pi..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo apt-get install -y nodejs
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo "✅ Node.js: $NODE_VERSION"
echo "✅ npm: $NPM_VERSION"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: package.json não encontrado. Execute este script do diretório raiz do projeto."
    exit 1
fi

# Instalar dependências
echo "📦 Instalando dependências do projeto..."
npm install

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado. Criando a partir do env.example..."
    if [ -f "env.example" ]; then
        cp env.example .env
        echo "✅ Arquivo .env criado. Por favor, edite-o com suas configurações:"
        echo "   nano .env"
    else
        echo "❌ env.example não encontrado. Crie um arquivo .env manualmente."
        exit 1
    fi
fi

# Verificar se Docker está rodando
if ! docker ps &> /dev/null; then
    echo "⚠️  Docker não está rodando. Iniciando Docker..."
    sudo systemctl start docker || echo "❌ Erro ao iniciar Docker. Verifique a instalação."
fi

# Detectar qual comando docker-compose usar
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    echo "✅ Usando docker-compose (V1)"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
    echo "✅ Usando docker compose (V2)"
else
    echo "❌ docker-compose não encontrado. Tentando instalar..."
    sudo apt-get update
    sudo apt-get install -y docker-compose || {
        echo "❌ Falha ao instalar docker-compose"
        echo "   Tente instalar manualmente: sudo apt-get install docker-compose"
        exit 1
    }
    DOCKER_COMPOSE_CMD="docker-compose"
fi

# Verificar se o container PostgreSQL está rodando
if ! docker ps 2>/dev/null | grep -q postgres; then
    echo "🐘 Iniciando container PostgreSQL..."
    cd "$(dirname "$0")/.." || exit 1
    if $DOCKER_COMPOSE_CMD up -d 2>&1; then
        echo "✅ Container PostgreSQL iniciado"
    else
        echo "⚠️  Erro ao iniciar PostgreSQL com $DOCKER_COMPOSE_CMD"
        # Tentar com a outra versão
        if [ "$DOCKER_COMPOSE_CMD" = "docker-compose" ]; then
            echo "   Tentando com 'docker compose'..."
            docker compose up -d || {
                echo "❌ Falha ao iniciar PostgreSQL"
                echo "   Verifique se o Docker está funcionando: sudo systemctl status docker"
                exit 1
            }
        else
            echo "   Tentando com 'docker-compose'..."
            docker-compose up -d || {
                echo "❌ Falha ao iniciar PostgreSQL"
                echo "   Verifique se o Docker está funcionando: sudo systemctl status docker"
                exit 1
            }
        fi
    fi
else
    echo "✅ Container PostgreSQL já está rodando"
fi

# Aguardar PostgreSQL estar pronto
echo "⏳ Aguardando PostgreSQL estar pronto..."
MAX_ATTEMPTS=60
ATTEMPT=0
POSTGRES_READY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    
    # Verificar se o container está rodando
    if ! docker ps 2>/dev/null | grep -q play_postgres; then
        echo "   Container não está rodando... ($ATTEMPT/$MAX_ATTEMPTS)"
        sleep 2
        continue
    fi
    
    # Verificar se o PostgreSQL está aceitando conexões
    if docker exec play_postgres pg_isready -U postgres > /dev/null 2>&1; then
        # Aguardar mais um pouco para garantir que está totalmente pronto
        sleep 3
        
        # Testar conexão real
        if docker exec play_postgres psql -U postgres -c "SELECT 1;" > /dev/null 2>&1; then
            echo "✅ PostgreSQL está pronto e aceitando conexões"
            POSTGRES_READY=true
            break
        fi
    fi
    
    if [ $((ATTEMPT % 5)) -eq 0 ]; then
        echo "   Aguardando PostgreSQL estar pronto... ($ATTEMPT/$MAX_ATTEMPTS)"
    fi
    sleep 2
done

if [ "$POSTGRES_READY" = false ]; then
    echo "⚠️  PostgreSQL não está respondendo após $MAX_ATTEMPTS tentativas"
    echo "   Verifique os logs: docker logs play_postgres"
    echo "   Status do container: docker ps | grep postgres"
    exit 1
fi

# Aguardar um pouco mais para garantir que está totalmente estável
echo "⏳ Aguardando estabilização do PostgreSQL..."
sleep 5

# Executar script de inicialização do banco
echo "🗄️  Inicializando banco de dados..."
MAX_RETRIES=3
RETRY=0
SUCCESS=false

while [ $RETRY -lt $MAX_RETRIES ]; do
    RETRY=$((RETRY + 1))
    echo "   Tentativa $RETRY de $MAX_RETRIES..."
    
    if node scripts/init-db.js 2>&1; then
        echo "✅ Banco de dados inicializado com sucesso"
        SUCCESS=true
        break
    else
        if [ $RETRY -lt $MAX_RETRIES ]; then
            echo "   Aguardando antes de tentar novamente..."
            sleep 5
        fi
    fi
done

if [ "$SUCCESS" = false ]; then
    echo "❌ Erro ao inicializar banco de dados após $MAX_RETRIES tentativas"
    echo ""
    echo "🔍 Diagnóstico:"
    echo "   Status do container:"
    docker ps | grep postgres || echo "   Container não está rodando"
    echo ""
    echo "   Logs do PostgreSQL:"
    docker logs --tail 20 play_postgres 2>&1 || echo "   Não foi possível ler os logs"
    echo ""
    echo "   Teste de conexão:"
    docker exec play_postgres pg_isready -U postgres || echo "   PostgreSQL não está respondendo"
    echo ""
    echo "💡 Tente executar manualmente:"
    echo "   node scripts/init-db.js"
    exit 1
fi

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "📝 Próximos passos:"
echo "  1. Edite o arquivo .env com suas configurações"
echo "  2. Execute: npm run build"
echo "  3. Execute: sudo bash scripts/install-service.sh"
echo "  4. Execute: sudo bash scripts/kiosk-setup.sh (opcional)"
echo ""

