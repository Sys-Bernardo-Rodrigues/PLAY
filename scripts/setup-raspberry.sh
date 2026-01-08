#!/bin/bash

# Script para configurar o ambiente no Raspberry Pi
# Execute com: bash scripts/setup-raspberry.sh

set -e

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

# Verificar se o container PostgreSQL está rodando
if ! docker ps | grep -q postgres; then
    echo "🐘 Iniciando container PostgreSQL..."
    docker-compose up -d || echo "⚠️  Erro ao iniciar PostgreSQL. Verifique docker-compose.yml"
fi

# Aguardar PostgreSQL estar pronto
echo "⏳ Aguardando PostgreSQL estar pronto..."
sleep 5

# Executar script de inicialização do banco
echo "🗄️  Inicializando banco de dados..."
node scripts/init-db.js

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "📝 Próximos passos:"
echo "  1. Edite o arquivo .env com suas configurações"
echo "  2. Execute: npm run build"
echo "  3. Execute: sudo bash scripts/install-service.sh"
echo "  4. Execute: sudo bash scripts/kiosk-setup.sh (opcional)"
echo ""

