-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf_cnpj TEXT UNIQUE,
  endereco TEXT,
  data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT 1
);

-- Tabela de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  numero_pedido TEXT UNIQUE NOT NULL,
  data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  data_entrega DATETIME,
  status TEXT DEFAULT 'pendente',
  observacoes TEXT,
  total_pedido REAL DEFAULT 0,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);

-- Tabela de Boletos
CREATE TABLE IF NOT EXISTS boletos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL,
  numero_boleto TEXT UNIQUE,
  valor REAL NOT NULL,
  data_vencimento DATETIME NOT NULL,
  status_pagamento TEXT DEFAULT 'pendente',
  data_pagamento DATETIME,
  data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

-- Tabela de Notas Fiscais
CREATE TABLE IF NOT EXISTS notas_fiscais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL,
  numero_nota_fiscal TEXT,
  caminho_arquivo TEXT,
  data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  data_upload DATETIME,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_boletos_pedido_id ON boletos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_boletos_status ON boletos(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_pedido_id ON notas_fiscais(pedido_id);
