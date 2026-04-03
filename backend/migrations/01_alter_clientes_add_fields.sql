-- Adicionar novos campos à tabela clientes
ALTER TABLE clientes ADD COLUMN razao_social TEXT;
ALTER TABLE clientes ADD COLUMN bairro TEXT;
ALTER TABLE clientes ADD COLUMN cidade TEXT;
ALTER TABLE clientes ADD COLUMN cep TEXT;
ALTER TABLE clientes ADD COLUMN inscricao_estadual TEXT;
ALTER TABLE clientes ADD COLUMN nome_fantasia TEXT;
