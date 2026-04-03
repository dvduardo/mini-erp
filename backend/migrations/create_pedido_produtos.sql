-- Tabela de Produtos do Pedido
CREATE TABLE IF NOT EXISTS pedido_produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL,
  codigo_fornecedor TEXT,
  cod_seq TEXT,
  produto_receber TEXT NOT NULL,
  embalagem TEXT,
  quantidade REAL NOT NULL,
  valor_unitario REAL NOT NULL,
  valor_item REAL NOT NULL,
  custo_bruto REAL,
  valor_icms_st REAL,
  data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pedido_produtos_pedido_id ON pedido_produtos(pedido_id);
