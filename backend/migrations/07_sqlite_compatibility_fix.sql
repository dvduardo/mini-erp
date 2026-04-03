-- SQLite compatibility fixes
-- This migration is specifically for SQLite, adding missing columns and ensuring compatibility

-- Add missing columns to clientes if they don't exist
-- SQLite doesn't support ALTER TABLE IF EXISTS, so we do it differently
CREATE TABLE IF NOT EXISTS clientes_temp AS
SELECT * FROM clientes;

-- Recreate clientes table with all required columns
DROP TABLE IF EXISTS clientes;

CREATE TABLE clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  ativo INTEGER DEFAULT 1
);

-- Copy data from temp table if it has id column
INSERT INTO clientes (id, nome, email, telefone, cpf_cnpj, endereco, razao_social, nome_fantasia, bairro, cidade, cep, inscricao_estadual, data_criacao, ativo)
SELECT id, nome, email, telefone, cpf_cnpj, endereco, razao_social, COALESCE(nome_fantasia, ''), bairro, cidade, cep, COALESCE(inscricao_estadual, ''), data_criacao, COALESCE(ativo, 1) FROM clientes_temp;

DROP TABLE IF EXISTS clientes_temp;

-- Ensure pedidos table has all required columns
DROP TABLE IF EXISTS pedidos;

CREATE TABLE pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  numero_pedido TEXT UNIQUE NOT NULL,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_emissao TIMESTAMP,
  data_entrega TIMESTAMP,
  status TEXT DEFAULT 'pendente',
  observacoes TEXT,
  total_pedido NUMERIC(10,2) DEFAULT 0,
  endereco_entrega TEXT,
  bairro_entrega TEXT,
  cidade_entrega TEXT,
  cep_entrega TEXT
);

-- Ensure pedido_produtos table structure
DROP TABLE IF EXISTS pedido_produtos;

CREATE TABLE pedido_produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id INTEGER,
  produto_receber TEXT,
  embalagem TEXT,
  cod_fornecedor TEXT,
  cod_seq TEXT,
  quantidade INTEGER NOT NULL,
  valor_unitario NUMERIC(10,2),
  valor_item NUMERIC(10,2),
  custo_bruto NUMERIC(10,2),
  valor_icms_st NUMERIC(10,2),
  subtotal NUMERIC(10,2)
);

-- Ensure boletos table structure
DROP TABLE IF EXISTS boletos;

CREATE TABLE boletos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  numero_boleto TEXT UNIQUE,
  valor NUMERIC(10,2) NOT NULL,
  data_vencimento TIMESTAMP NOT NULL,
  status_pagamento TEXT DEFAULT 'pendente',
  data_pagamento TIMESTAMP,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure notas_fiscais table structure
DROP TABLE IF EXISTS notas_fiscais;

CREATE TABLE notas_fiscais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  numero_nota_fiscal TEXT,
  caminho_arquivo TEXT,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure produtos table structure
DROP TABLE IF EXISTS produtos;

CREATE TABLE produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2),
  estoque INTEGER DEFAULT 0,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
