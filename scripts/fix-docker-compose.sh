#!/bin/bash

# Script para corrigir docker-compose.yml com chaves duplicadas
# Execute com: bash scripts/fix-docker-compose.sh

set -e

PROJECT_DIR="${1:-$(pwd)}"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ docker-compose.yml não encontrado em $PROJECT_DIR"
    exit 1
fi

echo "🔧 Corrigindo docker-compose.yml..."

# Fazer backup
cp "$COMPOSE_FILE" "$COMPOSE_FILE.backup"
echo "✅ Backup criado: $COMPOSE_FILE.backup"

# Remover todas as linhas com "restart: always"
sed -i '/restart: always/d' "$COMPOSE_FILE"

# Adicionar restart: always após "postgres:" (apenas uma vez)
sed -i '/postgres:/a\    restart: always' "$COMPOSE_FILE"

# Verificar se está correto
if grep -c "restart: always" "$COMPOSE_FILE" | grep -q "^1$"; then
    echo "✅ docker-compose.yml corrigido! (1 linha 'restart: always')"
    echo ""
    echo "📋 Verificando sintaxe..."
    if docker-compose -f "$COMPOSE_FILE" config > /dev/null 2>&1 || docker compose -f "$COMPOSE_FILE" config > /dev/null 2>&1; then
        echo "✅ Sintaxe YAML válida!"
    else
        echo "⚠️  Aviso: Erro ao validar sintaxe. Verifique manualmente."
    fi
else
    echo "❌ Erro: Ainda há problemas com restart: always"
    echo "   Verifique manualmente o arquivo: $COMPOSE_FILE"
    exit 1
fi

echo ""
echo "💡 Para restaurar o backup:"
echo "   cp $COMPOSE_FILE.backup $COMPOSE_FILE"

