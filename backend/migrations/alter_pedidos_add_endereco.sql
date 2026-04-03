-- Adicionar campos de endereço de entrega à tabela pedidos
ALTER TABLE pedidos ADD COLUMN endereco_entrega TEXT;
ALTER TABLE pedidos ADD COLUMN bairro_entrega TEXT;
ALTER TABLE pedidos ADD COLUMN cidade_entrega TEXT;
ALTER TABLE pedidos ADD COLUMN cep_entrega TEXT;
