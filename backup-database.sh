#!/bin/bash

# Script para fazer backup do banco de dados PostgreSQL no Heroku
# Uso: ./backup-database.sh seu-app-mini-erp

if [ -z "$1" ]; then
    echo "Erro: Forneça o nome do app Heroku"
    echo "Uso: ./backup-database.sh seu-app-mini-erp"
    exit 1
fi

APP_NAME=$1
BACKUP_DIR="backups"
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

# Criar pasta de backups se não existir
mkdir -p "$BACKUP_DIR"

echo "⏳ Fazendo backup do banco de dados $APP_NAME..."

# Obter DATABASE_URL e fazer dump
heroku config:get DATABASE_URL --app "$APP_NAME" | xargs pg_dump --compress > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup criado com sucesso!"
    echo "📁 Arquivo: $BACKUP_FILE"
    echo "📊 Tamanho: $SIZE"
    echo ""
    echo "Para restaurar:"
    echo "  heroku config:get DATABASE_URL --app $APP_NAME | xargs pg_restore -d --no-owner --no-privileges $BACKUP_FILE"
else
    echo "❌ Erro ao fazer backup"
    exit 1
fi
