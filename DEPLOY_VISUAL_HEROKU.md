# 🚀 Guia Visual: Deploy Mini-ERP no Heroku

> **Status**: Você ainda precisa criar uma conta Heroku. Este guia passo-a-passo vai ajudá-lo!

---

## 📋 Pré-requisitos

- ✅ Código pronto no GitHub (já feito!)
- ✅ Heroku CLI instalado (já feito!)
- ⏳ **Conta Heroku** (PRÓXIMO PASSO)

---

## 🔐 PASSO 1: Criar Conta no Heroku

1. **Acesse**: https://www.heroku.com
2. Clique em **"Sign up"** (canto superior direito)
3. Preencha:
   - Email (use o seu email pessoal)
   - Nome completo
   - Empresa (opcional: "Mini ERP")
   - País
   - Aceite os termos
4. Clique em **"Create Free Account"**
5. **Confirme seu email** (verifique a caixa de entrada)

**Tempo estimado**: 3-5 minutos

---

## 🏗️ PASSO 2: Fazer Login no Heroku CLI

Depois que sua conta estiver confirmada, volte ao terminal e execute:

```bash
cd /Users/david/Documents/projetos/mini-erp
heroku login
```

Você terá duas opções:
- **Opção 1** (Recomendado): Browser login - Pressione ENTER e aproveite o navegador
- **Opção 2**: Digitar email/senha no terminal

---

## 🚀 PASSO 3: Executar Deploy Automático

Depois de logado, execute o script de deploy com:

```bash
./deploy-heroku.sh
```

O script vai:
1. ✅ Confirmar login
2. ✅ Pedir um nome para o app (ex: `mini-erp-david`)
3. ✅ Criar o app no Heroku
4. ✅ Provisionar PostgreSQL gratuito
5. ✅ Gerar JWT_SECRET seguro
6. ✅ Fazer push do código
7. ✅ Iniciar o servidor

**Tempo estimado**: 5-10 minutos

---

## 📝 PASSO 4: Criar Primeiro Usuário

Depois que o deploy completar, você verá a URL da sua aplicação:

```
https://seu-app-mini-erp.herokuapp.com
```

Para criar seu primeiro usuário, execute:

```bash
curl -X POST https://seu-app-mini-erp.herokuapp.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"SuaSenhaForte123!"}'
```

Guarde o `token` que será retornado!

---

## ✅ PASSO 5: Acessar a Aplicação

1. Abra no navegador:
   ```
   https://seu-app-mini-erp.herokuapp.com
   ```

2. Você verá a tela de login
3. Clique em **"Criar conta"**
4. Registre um novo usuário
5. ✅ Sucesso! Você está logado! 🎉

---

## 🐛 Troubleshooting

### Erro: "Invalid credentials provided"
- Certifique-se de que sua **conta Heroku está confirmada** (verifique email)
- Tente fazer login via navegador em vez de terminal:
  ```bash
  heroku login --interactive
  ```

### Erro: "App name already taken"
- Use outro nome, ex: `mini-erp-seu-nome-123`

### App criado mas não funciona
- Verifique os logs:
  ```bash
  heroku logs --tail --app seu-app-name
  ```

### PostgreSQL demorou muito
- Espere 2-3 minutos e recarregue a página

---

## 📊 Próximos Passos

Depois do deploy bem-sucedido, você pode:

1. **Backup automático** (já ativado)
2. **Adicionar domínio customizado**
3. **Monitorar performance**
4. **Escalar a aplicação** (mudar de plano)

---

## 🔗 Links Úteis

- [Dashboard Heroku](https://dashboard.heroku.com)
- [Heroku CLI Docs](https://devcenter.heroku.com/articles/heroku-cli)
- [PostgreSQL no Heroku](https://devcenter.heroku.com/articles/heroku-postgresql)

---

## 📞 Precisa de Ajuda?

Qualquer dúvida, execute:

```bash
heroku help
heroku apps
heroku logs --tail --app seu-app-name
```

**Sucesso! 🚀**
