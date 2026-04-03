# 🚀 Deploy Rápido - Mini ERP Heroku

## Copiar e Colar os Comandos Abaixo

### PASSO 1: Login no Heroku
```bash
heroku login
```
👉 Quando pedir, abra o navegador que vai abrir automaticamente

---

### PASSO 2: Criar App (escolha um nome único)
```bash
# SUBSTITUA "seu-app-nome" por algo único como "mini-erp-david-123"
heroku create seu-app-nome
```

**Exemplo:**
```bash
heroku create mini-erp-david
```

---

### PASSO 3: Provisionar PostgreSQL Gratuito
```bash
# SUBSTITUA "seu-app-nome" pelo nome que usou no passo anterior
heroku addons:create heroku-postgresql:hobby-dev --app seu-app-nome
```

**Exemplo:**
```bash
heroku addons:create heroku-postgresql:hobby-dev --app mini-erp-david
```

---

### PASSO 4: Gerar e Configurar JWT Secret

#### 4A: Gerar código seguro
```bash
openssl rand -hex 32
```
👉 **Copie o resultado que aparecer**

#### 4B: Configurar no Heroku
```bash
# SUBSTITUA:
# - "seu-jwt-secret" = o código que você copiou acima
# - "seu-app-nome" = o nome do app
heroku config:set JWT_SECRET="seu-jwt-secret" NODE_ENV=production --app seu-app-nome
```

**Exemplo:**
```bash
heroku config:set JWT_SECRET="a3f8b2c1e9d4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5" NODE_ENV=production --app mini-erp-david
```

---

### PASSO 5: Fazer Deploy (Push do Código)
```bash
git push heroku develop:main
```

👉 Espere até ver mensagens como:
- `remote: Compressing source files`
- `remote: Building application`
- `remote: Released v1`

Quando terminar, você terá uma URL como:
```
https://seu-app-nome.herokuapp.com
```

---

## ✅ Verificar Deploy

### Logs em tempo real
```bash
heroku logs --tail --app seu-app-nome
```

### Verificar apps criados
```bash
heroku apps
```

### Acessar o app
Abra no navegador:
```
https://seu-app-nome.herokuapp.com
```

---

## 👤 Criar Primeiro Usuário

Depois que o app estiver rodando:

```bash
# SUBSTITUA "seu-app-nome" e dados de senha
curl -X POST https://seu-app-nome.herokuapp.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"SenhaForte123!","email":"seu@email.com"}'
```

A resposta conterá um `token` - guarde para o próximo step!

---

## 🎉 Sucesso!

Se tudo funcionou:
1. Acesse: `https://seu-app-nome.herokuapp.com`
2. Veja a tela de login
3. Clique em "Criar Conta" 
4. Registre um novo usuário
5. 🎉 Você tem a Mini ERP em produção!

---

## 🆘 Problemas?

### Erro no login do Heroku
```bash
# Tente com browser login
heroku login --interactive
```

### Erro: "App creation failed"
- Use outro nome (mais curto e sem caracteres especiais)
- Exemplo: `mini-erp-prod-123`

### Errona view por PostgreSQL
- Espere 2-3 minutos para o banco inicializar
- Depois recrregue o navegador

### Aplicação não abre
```bash
# Ver logs detalhados
heroku logs --tail --app seu-app-nome

# Procure por erros como "Cannot connect to database"
```

---

## 📊 Informações do App

```bash
# Ver todas as variáveis de ambiente
heroku config --app seu-app-nome

# Ver status do banco de dados
heroku pg:info --app seu-app-nome

# Ver estatísticas dyno
heroku ps --app seu-app-nome
```

---

## 📱 Próximos Passos (Opcional)

### Backup manual do banco
```bash
heroku pg:backups:capture --app seu-app-nome
heroku pg:backups:download --app seu-app-nome
```

### Monitorar em tempo real
```bash
# Abrir dashboard no navegador
heroku open --app seu-app-nome
```

### Rollback (se algo der errado)
```bash
git push heroku develop:main --force
```

---

## ✨ Parabéns! 

Você tem uma MiniERP completa em produção com:
- ✅ Autenticação JWT segura
- ✅ PostgreSQL em nuvem
- ✅ Backup automático
- ✅ URL HTTPS gratuita
- ✅ Escalabilidade pronta

🚀 Sucesso!
