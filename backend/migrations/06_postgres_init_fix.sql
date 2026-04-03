-- Corrigir tabelas para PostgreSQL (remover AUTOINCREMENT e usar SERIAL)

-- Recriar tabela clientes se não existir corretamente
DROP TABLE IF EXISTS clientes CASCADE;

CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf_cnpj TEXT UNIQUE,
  endereco TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
  bairro TEXT,
  cidade TEXT,
  cep TEXT,
  inscricao_estadual TEXT,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE
);

-- Recriar tabela pedidos
DROP TABLE IF EXISTS pedidos CASCADE;

CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  numero_pedido TEXT UNIQUE NOT NULL,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_emissao TIMESTAMP,
  data_entrega TIMESTAMP,
  status TEXT DEFAULT 'pendente',
  observacoes TEXT,
  total_pedido DECIMAL(10,2) DEFAULT 0,
  endereco_entrega TEXT,
  bairro_entrega TEXT,
  cidade_entrega TEXT,
  cep_entrega TEXT
);

-- Recriar tabela de produtos do pedido
DROP TABLE IF EXISTS pedido_produtos CASCADE;

CREATE TABLE pedido_produtos (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id INTEGER,
  produto_receber TEXT,
  embalagem TEXT,
  cod_fornecedor TEXT,
  cod_seq TEXT,
  quantidade INTEGER NOT NULL,
  valor_unitario DECIMAL(10,2),
  valor_item DECIMAL(10,2),
  custo_bruto DECIMAL(10,2),
  valor_icms_st DECIMAL(10,2),
  subtotal DECIMAL(10,2)
);

-- Recriar tabela boletos
DROP TABLE IF EXISTS boletos CASCADE;

CREATE TABLE boletos (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  numero_boleto TEXT UNIQUE,
  valor DECIMAL(10,2) NOT NULL,
  data_vencimento TIMESTAMP NOT NULL,
  status_pagamento TEXT DEFAULT 'pendente',
  data_pagamento TIMESTAMP,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recriar tabela notas_fiscais
DROP TABLE IF EXISTS notas_fiscais CASCADE;

CREATE TABLE notas_fiscais (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  numero_nota_fiscal TEXT,
  caminho_arquivo TEXT,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_upload TIMESTAMP
);

-- Recriar tabela produtos
DROP TABLE IF EXISTS produtos CASCADE;

CREATE TABLE produtos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2),
  quantidade_estoque INTEGER DEFAULT 0,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhor performance
CREATE INDEX idx_pedidos_cliente_id ON pedidos(cliente_id);
CREATE INDEX idx_boletos_pedido_id ON boletos(pedido_id);
CREATE INDEX idx_boletos_status ON boletos(status_pagamento);
CREATE INDEX idx_notas_fiscais_pedido_id ON notas_fiscais(pedido_id);
CREATE INDEX idx_pedido_produtos_pedido_id ON pedido_produtos(pedido_id);

-- Garantir que users table existe
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
