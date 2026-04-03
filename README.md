# Mini ERP 🏢

Sistema simples de gestão empresarial para gerenciar clientes, pedidos, produtos, boletos e notas fiscais.

## Características

✅ **Gestão de Clientes** - Cadastro, edição e exclusão de clientes  
✅ **Gestão de Pedidos** - Criar pedidos associados a clientes com datas de criação e entrega  
✅ **Gestão de Produtos** - Itens vinculados a pedidos com quantidade e valor  
✅ **Gestão de Boletos** - Registrar boletos com vencimento e status de pagamento  
✅ **Notas Fiscais** - Upload e armazenamento de PDFs  
✅ **Dashboard** - Resumo financeiro com somas de boletos recebidos, a receber e total de clientes/pedidos  

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite

## Instalação

### Backend

```bash
cd backend
npm install
npm run dev
```

O servidor rodará em `http://localhost:5001`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

A aplicação será aberta em `http://localhost:3000`

## Estrutura do Projeto

```
mini-erp/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuração do banco de dados
│   │   ├── controllers/     # Lógica das rotas (CRUD)
│   │   │   ├── clienteController.js
│   │   │   ├── pedidoController.js
│   │   │   ├── produtoController.js
│   │   │   ├── boletoController.js
│   │   │   └── notaFiscalController.js
│   │   ├── routes/          # Definição das rotas da API
│   │   │   ├── clienteRoutes.js
│   │   │   ├── pedidoRoutes.js
│   │   │   ├── produtoRoutes.js
│   │   │   ├── boletoRoutes.js
│   │   │   └── notaFiscalRoutes.js
│   │   └── app.js           # Setup do Express
│   ├── migrations/          # Scripts de inicialização do BD
│   ├── uploads/             # Armazenamento de notas fiscais
│   └── server.js            # Entrada da aplicação
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── pages/           # Páginas principais
│   │   ├── services/        # Chamadas para API
│   │   └── App.jsx
│   └── index.html
└── README.md
```

## API Endpoints

### Clientes
- `GET /api/clientes` - Listar todos
- `GET /api/clientes/:id` - Obter um cliente
- `POST /api/clientes` - Criar novo
- `PUT /api/clientes/:id` - Atualizar
- `DELETE /api/clientes/:id` - Deletar

### Pedidos
- `GET /api/pedidos` - Listar todos
- `GET /api/pedidos/:id` - Obter um pedido
- `POST /api/pedidos` - Criar novo
- `PUT /api/pedidos/:id` - Atualizar
- `DELETE /api/pedidos/:id` - Deletar

### Produtos
- `GET /api/produtos/pedido/:pedido_id` - Listar produtos de um pedido
- `GET /api/produtos/:id` - Obter um produto
- `POST /api/produtos` - Criar novo
- `PUT /api/produtos/:id` - Atualizar
- `DELETE /api/produtos/:id` - Deletar

### Boletos
- `GET /api/boletos` - Listar todos (com filtro de status opcional)
- `GET /api/boletos/:id` - Obter um boleto
- `GET /api/boletos/resumo/financeiro` - Resumo de boletos (para dashboard)
- `POST /api/boletos` - Criar novo
- `PUT /api/boletos/:id` - Atualizar
- `DELETE /api/boletos/:id` - Deletar

### Notas Fiscais
- `GET /api/notas-fiscais` - Listar todas
- `GET /api/notas-fiscais/:id` - Obter uma nota
- `POST /api/notas-fiscais/upload` - Upload de PDF
- `DELETE /api/notas-fiscais/:id` - Deletar

## Fluxo de Uso

1. **Cadastre Clientes** - Acesse a aba "Clientes" e adicione novos clientes
2. **Crie Pedidos** - Na aba "Pedidos", crie um novo pedido relacionando com um cliente
3. **Adicione Produtos** - Vincule produtos/itens ao pedido com quantidade e valor
4. **Registre Boletos** - Na aba "Boletos", crie boletos para o pedido com valor e data de vencimento
5. **Marque como Recebido** - Use o checkbox na tabela de boletos para marcar quando receber
6. **Acompanhe Dashboard** - Veja o resumo financeiro na página inicial

## Notas Importantes

- O banco de dados SQLite é criado automaticamente na primeira execução
- Todas as datas são armazenadas em UTC
- Notas fiscais são armazenadas em `/backend/uploads/`
- Soft delete para clientes (mantém histórico)

## Próximas Melhorias

- [ ] Autenticação de usuários
- [ ] Geração automática de boletos
- [ ] Integração com bancos para validação de boletos
- [ ] Relatórios PDF
- [ ] Backup automático do banco
- [ ] Temas escuro/claro
- [ ] Modo offline

---

**Desenvolvido para gerenciar pequenos negócios** 💼
