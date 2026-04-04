# Migracao Heroku -> Railway

Este projeto pode ir para o Railway como um unico servico web na raiz do repositorio.

O fluxo recomendado e:

1. Criar backup do banco no Heroku
2. Criar projeto no Railway
3. Adicionar PostgreSQL no Railway
4. Anexar um Volume ao servico web em `/data`
5. Configurar variaveis de ambiente
6. Restaurar o banco no PostgreSQL do Railway
7. Validar login, uploads e backups

## 1. Backup do banco no Heroku

Use a CLI do Heroku para gerar um dump logico do banco atual:

```bash
heroku pg:backups:capture --app SEU_APP_HEROKU
heroku pg:backups:download --app SEU_APP_HEROKU
```

Isso deve baixar um arquivo como `latest.dump`.

Referencia oficial:

- https://devcenter.heroku.com/articles/heroku-postgres-backups

## 2. Criar o projeto no Railway

No Railway:

1. Crie um novo projeto
2. Conecte este repositorio GitHub
3. Use a raiz do repositorio `/`
4. Mantenha um unico servico web para este app

O arquivo [`railway.json`](/Users/david/Documents/projetos/mini-erp/railway.json) ja deixa o Railway preparado para:

- buildar o frontend com `npm run build`
- iniciar o backend com `npm start`
- validar a saude por `GET /api/health`

Referencias oficiais:

- https://docs.railway.com/reference/config-as-code
- https://docs.railway.com/deployments/healthchecks

## 3. Adicionar PostgreSQL no Railway

Adicione um servico PostgreSQL no mesmo projeto Railway.

Ao conectar o banco ao servico web, o Railway disponibiliza `DATABASE_URL` automaticamente.

Referencia oficial:

- https://docs.railway.com/guides/postgresql

## 4. Criar Volume persistente

No servico web, anexe um Volume em:

```text
/data
```

Depois use:

- `UPLOADS_DIR=/data/uploads`
- `BACKUP_DIR=/data/backups`

Isso garante persistencia para PDFs e backups locais entre deploys.

## 5. Variaveis de ambiente do servico web

Configure estas variaveis no Railway:

```env
NODE_ENV=production
JWT_SECRET=troque-por-um-segredo-longo-e-aleatorio
ALLOW_SQLITE_IN_PRODUCTION=false

APP_URL=https://SEU-DOMINIO-DO-RAILWAY.railway.app
CORS_ORIGIN=https://SEU-DOMINIO-DO-RAILWAY.railway.app

UPLOADS_DIR=/data/uploads
BACKUP_DIR=/data/backups

BACKUP_SCHEDULE_ENABLED=true
BACKUP_INTERVAL_HOURS=24
BACKUP_RETENTION_DAYS=14
BACKUP_RUN_ON_START=false
```

Se quiser manter upload do backup para Google Drive:

```env
GOOGLE_DRIVE_BACKUP_ENABLED=true
GOOGLE_DRIVE_FOLDER_ID=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=...
```

Se quiser que o backup do banco rode dentro da propria app via `pg_dump`, adicione tambem:

```env
RAILPACK_DEPLOY_APT_PACKAGES=postgresql-client
```

Sem isso, o Railway pode subir a aplicacao normalmente, mas o script de backup PostgreSQL pode falhar por falta do binario `pg_dump`.

Referencia oficial:

- https://docs.railway.com/builds/build-configuration

## 6. Restaurar o dump do Heroku no Railway

Pegue a `DATABASE_URL` do PostgreSQL do Railway e restaure o dump:

```bash
export RAILWAY_DATABASE_URL='COLE_A_DATABASE_URL_DO_RAILWAY_AQUI'
pg_restore --clean --if-exists --no-owner --no-privileges -d "$RAILWAY_DATABASE_URL" latest.dump
```

Se o seu ambiente local nao tiver `pg_restore`, instale o cliente PostgreSQL primeiro.

Referencias oficiais:

- https://devcenter.heroku.com/articles/heroku-postgres-import-export
- https://devcenter.heroku.com/articles/heroku-postgres-logical-backups

## 7. Migrar arquivos enviados

Se seus PDFs/notas estavam apenas no disco efemero do Heroku, eles podem nao estar completos para migracao.

Se voce tiver copia local, backup anterior ou storage externo, envie esses arquivos para o volume novo em `/data/uploads`.

Como o projeto serve os uploads pelo backend, o caminho persistente correto no Railway deve ser o mesmo definido em `UPLOADS_DIR`.

## 8. Checklist final

Depois do primeiro deploy no Railway:

1. Abra `/api/health`
2. Faça login no sistema
3. Confira clientes, pedidos, boletos e produtos
4. Abra uma nota fiscal antiga para validar uploads
5. Rode `npm run backup` localmente ou no shell do Railway para validar backups
6. Verifique se um novo backup aparece em `/data/backups`

## 9. O que desligar no Heroku

So desligue o Heroku depois de validar:

1. banco restaurado no Railway
2. login funcionando
3. uploads acessiveis
4. backup funcionando
5. dominio final apontando para o Railway

Se quiser um periodo seguro de transicao, mantenha o Heroku ligado por alguns dias em modo somente observacao.
