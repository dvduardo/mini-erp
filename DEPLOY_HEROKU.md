# 🚀 Guia Completo: Deploy Mini-ERP no Heroku

## ✅ Pré-requisitos

1. **Git instalado** - Para pushear código
2. **Node.js 18+** - Backend runtime
3. **Conta GitHub** - Repository
4. **Conta Heroku** - Plataforma de deploy (grátis)

---

## 📋 Passo 1: Preparar Repositório Git

```bash
# Na raiz do projeto
git init
git add .
git commit -m "Initial commit: Mini ERP with authentication"
git branch -M main
git remote add origin https://github.com/seu-usuario/mini-erp.git
git push -u origin main
```

> **Nota**: Substitua `seu-usuario` pelo seu nome de usuário GitHub

---

## 🔐 Passo 2: Instalar e Configurar Heroku CLI

### Mac
```bash
brew tap heroku/brew && brew install heroku
```

### Linux/Windows
Baixe em: https://devcenter.heroku.com/articles/heroku-cli

### Depois de instalar:
```bash
# Fazer login
heroku login

# Verificar login
heroku auth:whoami
```

---

## 🏗️ Passo 3: Criar App no Heroku

```bash
# Criar aplicação (escolha um nome único)
heroku create seu-app-mini-erp

# Ou, se quer especificar onde fazer deploy
heroku create seu-app-mini-erp --region us
# Regiões: us (EUA), eu (Europa)

# Verificar que o remote foi adicionado
git remote -v
```

**Output esperado:**
```
heroku  https://git.heroku.com/seu-app-mini-erp.git (fetch)
heroku  https://git.heroku.com/seu-app-mini-erp.git (push)
```

---

## 🗄️ Passo 4: Provisionar PostgreSQL

```bash
# Provisionar PostgreSQL (plano hobby/free)
heroku addons:create heroku-postgresql:hobby-dev --app seu-app-mini-erp

# Verificar que o banco foi criado
heroku config --app seu-app-mini-erp
```

**Output esperado:**
```
DATABASE_URL: postgres://user:password@host:port/database
```

---

## 🔑 Passo 5: Configurar Variáveis de Ambiente

```bash
# JWT Secret (gere uma chave segura)
openssl rand -hex 32
# Copie o output (ex: a3f8b2c1e9d4f5g6h7i8j9k0l1m2n3o4)

# Setar as variáveis no Heroku
heroku config:set \
  JWT_SECRET="a3f8b2c1e9d4f5g6h7i8j9k0l1m2n3o4" \
  NODE_ENV=production \
  --app seu-app-mini-erp

# Verificar configuração
heroku config --app seu-app-mini-erp
```

> **IMPORTANTE**: Use uma chave segura! Nunca commite secretos no Git.

---

## 📤 Passo 6: Deploy Inicial

```bash
# Fazer push do código para Heroku
git push heroku main

# O Heroku vai automaticamente:
# 1. Instalar dependências
# 2. Executar o comando no Procfile
# 3. Iniciar o servidor
```

**Monitorar logs:**
```bash
# Ver logs em tempo real
heroku logs --tail --app seu-app-mini-erp

# Ou parar após 100 linhas
heroku logs --lines=100 --app seu-app-mini-erp
```

---

## 🎯 Passo 7: Criar Primeiro Usuário (Admin)

### Opção A: Via API curl
```bash
# Substituir seu-app-mini-erp pelo seu app
curl -X POST https://seu-app-mini-erp.herokuapp.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"SuaSenhaForte123!","email":"seu@email.com"}'
```

### Opção B: Via Heroku Console
```bash
# Acessar console Node.js no servidor Heroku
heroku run node --app seu-app-mini-erp
```

Depois rodar (dentro do console):
```javascript
import { dbRun } from './backend/src/config/database.js';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const userId = uuidv4();
const passwordHash = await bcryptjs.hash('SuaSenhaForte123!', 10);
await dbRun(
  'INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)',
  [userId, 'admin', passwordHash, 'seu@email.com']
);
console.log('Usuário criado!');
```

---

## ✅ Passo 8: Acessar a Aplicação

```
https://seu-app-mini-erp.herokuapp.com
```

1. Você verá a tela de login
2. Clique em "Criar conta" e registre um novo usuário, OU
3. Faça login com o usuário admin criado acima

---

## 📊 Passo 9: Backup Automático (PostgreSQL)

Heroku Postgres já vem com backup automático ativado:

### Verificar backups
```bash
heroku addons:info heroku-postgresql --app seu-app-mini-erp
```

**Características do plano hobby-dev:**
- ✅ Backups automáticos: **Daily** (retenção de 7 dias)
- ✅ Backup manual a qualquer momento
- ✅ Restauração fácil

### Fazer backup manual
```bash
# Capturar URL do banco
DB_URL=$(heroku config:get DATABASE_URL --app seu-app-mini-erp)

# Fazer dump (backup)
pg_dump $DB_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Esse arquivo fica salvo no seu computador
ls -lh backup_*.sql
```

### Restaurar backup
```bash
# Se precisar restaurar depois
psql $DB_URL < backup_20260403_112000.sql
```

---

## 🔄 Passo 10: Fazer Novos Deploys

Cada vez que atualizar o código:

```bash
# 1. Commitar as mudanças
git add .
git commit -m "Mensagem descritiva da mudança"

# 2. Fazer push para Heroku
git push heroku main

# 3. Se houver mudanças no banco, Heroku roda o Procfile release command
# (As migrações executam automaticamente)

# 4. Ver logs
heroku logs --tail --app seu-app-mini-erp
```

---

## 🐛 Troubleshooting

### Erro: "E não tenho Heroku CLI"
```bash
# Instalar
brew install heroku

# Ou baixar em https://devcenter.heroku.com/articles/heroku-cli
```

### Erro: "Database connection failed"
```bash
# Verificar se DATABASE_URL está setada
heroku config --app seu-app-mini-erp | grep DATABASE_URL

# Se não estiver, reprovisionar:
heroku addons:create heroku-postgresql:hobby-dev --app seu-app-mini-erp
```

### Erro: "Application error" ao acessar
```bash
# Ver logs detalhados
heroku logs --tail --app seu-app-mini-erp

# Pode ser:
# 1. JWT_SECRET não está configurado
# 2. Banco não foi inicializado
# 3. Node version mismatch
```

### Erro: "Push rejected"
```bash
# Ter certeza de que está no branch correto
git branch

# Se não estiver em main:
git checkout main
git merge seu-branch

git push heroku main
```

---

## 📈 Próximos Passos (Opcional)

1. **Domínio customizado**
   ```bash
   heroku domains:add seu-dominio.com --app seu-app-mini-erp
   # Depois configurar DNS no provedor
   ```

2. **SSL/HTTPS forçado**
   ```bash
   heroku config:set SECURE_SSL_REDIRECT=true --app seu-app-mini-erp
   ```

3. **Monitorar performance**
   - Heroku Dashboard > seu-app > Heroku Metrics
   - Ver CPU, RAM, conexões DB

4. **Escalabilidade**
   ```bash
   # Aumentar potência do dyno (de grátis para $7/mês)
   heroku dyno:type standard-1x --app seu-app-mini-erp
   ```

---

## 🎉 Parabéns!

Sua aplicação Mini ERP está online e disponível para uso! 🚀

### Checklist Final:
- ✅ Código no GitHub
- ✅ App criado no Heroku
- ✅ PostgreSQL provisionado
- ✅ Variáveis de ambiente configuradas
- ✅ Primeiro deploy realizado
- ✅ Usuário admin criado
- ✅ Backup automático ativado
- ✅ Aplicação acessível em produção

---

## 📞 Suporte

- **Heroku Docs**: https://devcenter.heroku.com
- **PostgreSQL no Heroku**: https://devcenter.heroku.com/articles/heroku-postgresql
- **Node.js on Heroku**: https://devcenter.heroku.com/articles/nodejs-support
