#!/bin/bash

# Script de Deploy Automático no Heroku
# ====================================
# Este script automatiza todo o processo de deploy da Mini ERP

set -e # Exit se houver erro

echo "🚀 DEPLOY AUTOMÁTICO - MINI ERP HEROKU"
echo "======================================"
echo ""
echo "Este script vai:"
echo "1. Fazer login no Heroku"
echo "2. Criar um novo app"
echo "3. Provisionar PostgreSQL"
echo "4. Configurar variáveis de ambiente"
echo "5. Fazer push e deploy"
echo ""

# PASSO 1: Login
echo "📝 PASSO 1: Login no Heroku"
echo "=============================="
echo "Você será redirecionado para o navegador para autenticar."
echo "Pressione ENTER para continuar..."
read

heroku login

echo "✅ Login bem-sucedido!"
echo ""

# PASSO 2: Criar app
echo "📝 PASSO 2: Criar App no Heroku"
echo "================================="
echo ""
echo "Qual será o nome do seu app? (ex: mini-erp-david)"
read -p "Nome do app: " APP_NAME

if [ -z "$APP_NAME" ]; then
  echo "❌ Nome do app é obrigatório"
  exit 1
fi

echo ""
echo "Criando app: $APP_NAME"
heroku create $APP_NAME

echo "✅ App criado com sucesso!"
echo ""

# PASSO 3: Provisionar PostgreSQL
echo "📝 PASSO 3: Provisionar PostgreSQL"
echo "===================================="
heroku addons:create heroku-postgresql:hobby-dev --app $APP_NAME

echo "✅ PostgreSQL provisionado!"
echo ""

# PASSO 4: Gerar JWT Secret seguro
echo "📝 PASSO 4: Configurar Variáveis de Ambiente"
echo "=============================================="
echo ""
echo "Gerando chave JWT segura..."
JWT_SECRET=$(openssl rand -hex 32)

echo "✅ JWT_SECRET gerado: ${JWT_SECRET:0:16}..."
echo ""

echo "Configurando variáveis no Heroku..."
heroku config:set \
  JWT_SECRET="$JWT_SECRET" \
  NODE_ENV=production \
  --app $APP_NAME

echo "✅ Variáveis configuradas!"
echo ""

# PASSO 5: Deploy
echo "📝 PASSO 5: Fazer Deploy"
echo "========================"
echo ""
echo "Fazendo push do código para Heroku..."
git push heroku main

echo ""
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo ""

# Informações finais
HEROKU_URL="https://$APP_NAME.herokuapp.com"
echo "======================================"
echo "📱 Sua aplicação está disponível em:"
echo "   $HEROKU_URL"
echo ""
echo "📝 Próximos passos:"
echo "1. Criar primeiro usuário:"
echo "   curl -X POST $HEROKU_URL/api/auth/register \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"username\":\"admin\",\"password\":\"SuaSenha123!\"}'"
echo ""
echo "2. Acessar a aplicação no navegador"
echo ""
echo "📊 Ver logs em tempo real:"
echo "   heroku logs --tail --app $APP_NAME"
echo ""
echo "======================================"
