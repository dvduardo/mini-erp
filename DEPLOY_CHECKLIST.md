# ✅ CHECKLIST deploy Mini-ERP Heroku

## 📋 Pré-requisitos
- [ ] Git instalado: `git --version`
- [ ] Node.js 18+: `node --version`
- [ ] Heroku CLI instalado: `heroku --version`
- [ ] Código no GitHub: `git status`

---

## 🎯 ANTES DO DEPLOY

### 1️⃣ Criar Conta Heroku
- [ ] Acesse https://www.heroku.com
- [ ] Clique "Sign up"
- [ ] Preencha formulário
- [ ] **Confirme seu email**
- [ ] Volte à aplicação

### 2️⃣ Fazer Login Local
- [ ] Execute: `heroku login`
- [ ] Navegador abre automaticamente
- [ ] Authorize (clique green button)
- [ ] Terminal mostra "Authentication successful"

### 3️⃣ Preparar Repo Git
- [ ] `git status` (working tree clean?)
- [ ] `git log --oneline | head -3` (commits visíveis?)
- [ ] Branch correta? `git branch`

---

## 🚀 DEPLOY AUTOMÁTICO

### 4️⃣ Criar App no Heroku
```bash
# EXECUTE:
heroku create seu-app-mini-erp

# ESPERE PELA MENSAGEM:
# Creating ⬢ seu-app-mini-erp... done
# https://seu-app-mini-erp.herokuapp.com | https://git.heroku.com/seu-app-mini-erp.git
```
- [ ] App criado com sucesso?
- [ ] Anotou o nome? _________________

### 5️⃣ Provisionar PostgreSQL
```bash
# EXECUTE (SUBSTITUA seu-app-mini-erp):
heroku addons:create heroku-postgresql:hobby-dev --app seu-app-mini-erp

# ESPERE:
# Creating heroku-postgresql:hobby-dev on ⬢ seu-app-mini-erp... free
# Database has been created and is available
```
- [ ] PostgreSQL criado?
- [ ] Status mostra "available"?

### 6️⃣ Gerar JWT Secret e Setar Variáveis
```bash
# PASSO A: Gerar chave
openssl rand -hex 32
# Você verá: a3f8b2c1e9d4f5g6h7i8j9k0l1m2n3o4...
# COPIE ESTE VALOR

# PASSO B: Configurar (SUBSTITUA os valores)
heroku config:set JWT_SECRET="a3f8b2c1e9d4f5g6h7i8j9k0l1m2n3o4" NODE_ENV=production --app seu-app-mini-erp

# ESPERE:
# Setting config vars and restarting ⬢ seu-app-mini-erp... done, v1
# JWT_SECRET: a3f8b2c1e9d4f5g6h7i8j9k0l1m2n3o4
# NODE_ENV: production
```
- [ ] Chave JWT gerada?
- [ ] Variáveis setadas?
- [ ] Mensagem "done, v1" apareceu?

### 7️⃣ Fazer Deploy (Push para Heroku)
```bash
# EXECUTE:
git push heroku develop:main

# ESPERE MENSAGENS:
# remote: Compressing source files... done.
# remote: Building application...
# remote: -----> Node.js app detected
# remote: -----> Building dependencies
# remote: -----> Caching node_modules
# remote: -----> Build succeeded!
# remote: -----> Discovering process types
# remote: -----> Launching...
# remote: Released v1
```
- [ ] Build completed?
- [ ] "Released v1" apareceu?
- [ ] Nenhum erro?

---

## ✅ PÓS-DEPLOY

### 8️⃣ Verificar Aplicação
```bash
# Ver logs
heroku logs --tail --app seu-app-mini-erp
# Procure por: "🚀 Servidor rodando"
```
- [ ] Servidor está rodando?
- [ ] Conexão PostgreSQL OK?
- [ ] Sem erros críticos?

### 9️⃣ Testar API
```bash
# SUBSTITUA seu-app-mini-erp
curl https://seu-app-mini-erp.herokuapp.com/api/health
# Deve retornar: {"status":"ok","message":"Server is running"}
```
- [ ] API respondeu?
- [ ] Status 200 OK?

### 🔟 Criar Primeiro Usuário
```bash
# EXECUTE (SUBSTITUA seu-app-mini-erp e senha)
curl -X POST https://seu-app-mini-erp.herokuapp.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"SenhaForte123!","email":"seu@email.com"}'

# Você verá resposta com token JWT
```
- [ ] Usuário criado?
- [ ] Token JWT recebido?

---

## 🎉 FINAL

### ⓶① Acessar Aplicação
1. Abra navegador: `https://seu-app-mini-erp.herokuapp.com`
2. Você verá **tela de login** ✅
3. Clique **"Criar conta"**
4. Registre novo usuário
5. Faça **login**
6. ✅ **DASHBOARD CARREGOU!**

- [ ] Tela de login apareceu?
- [ ] Conseguiu criar usuário?
- [ ] Dashboard carregou?

---

## 🎊 SUCESSO!

Parabéns! Sua Mini ERP está **LIVE EM PRODUÇÃO!** 🚀

### 📊 Resumo do que foi feito:
- ✅ Conta Heroku criada
- ✅ App provisionado com PostgreSQL
- ✅ Código deployado via Git
- ✅ Variáveis de ambiente configuradas
- ✅ Segurança ativa (JWT, CORS, helmet)
- ✅ Backup automático diário
- ✅ HTTPS gratuito

### 🔗 Próximos Passos (Opcional):
1. Adicionar domínio customizado (seu-dominio.com)
2. Escalar dynos (aumentar performance)
3. Adicionar APM (monitoramento)
4. Scripts de backup manual

### 💬 Dúvidas?
```bash
# Ver status completo do app
heroku status --app seu-app-mini-erp

# Ver todos os apps seus
heroku apps

# Abrir dashboard no navegador
heroku open --app seu-app-mini-erp
```

---

## 📝 Anotações

### Seu App
- Nome: _________________________________
- URL: _________________________________
- JWT Secret (copie em lugar seguro): _________________________________
- Usuário Admin: _________________________________
- Senha Admin: _________________________________

---

**Data Deploy**: ___/___/_____  
**Executado por**: _________________________________

🎉 **PROJETO CONCLUÍDO - MINI ERP EM PRODUÇÃO!** 🎉
