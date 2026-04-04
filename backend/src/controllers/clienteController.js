import { dbRun, dbGet, dbAll } from '../config/database.js';

function normalizeRequired(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeOptional(value) {
  if (typeof value !== 'string') {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function isUniqueConstraintError(err) {
  return err.message.includes('UNIQUE constraint failed') || err.message.includes('duplicate key value violates unique constraint');
}

// Listar todos os clientes
export const getClientes = async (req, res) => {
  try {
    const clientes = await dbAll('SELECT * FROM clientes WHERE ativo = true ORDER BY nome');
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obter cliente por ID
export const getClienteById = async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await dbGet('SELECT * FROM clientes WHERE id = ?', [id]);
    
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    res.json(cliente);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Criar cliente
export const createCliente = async (req, res) => {
  try {
    const { 
      nome, email, telefone, cpf_cnpj, endereco,
      razao_social, nome_fantasia, bairro, cidade, cep, inscricao_estadual
    } = req.body;

    const normalizedNome = normalizeRequired(nome);
    const normalizedCpfCnpj = normalizeRequired(cpf_cnpj);
    
    if (!normalizedNome) {
      return res.status(400).json({ error: 'Campo "nome" é obrigatório' });
    }

    if (!normalizedCpfCnpj) {
      return res.status(400).json({ error: 'Campo "CPF/CNPJ" é obrigatório' });
    }
    
    const result = await dbRun(
      `INSERT INTO clientes (
        nome, email, telefone, cpf_cnpj, endereco,
        razao_social, nome_fantasia, bairro, cidade, cep, inscricao_estadual
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        normalizedNome,
        normalizeOptional(email),
        normalizeOptional(telefone),
        normalizedCpfCnpj,
        normalizeOptional(endereco),
        normalizeOptional(razao_social),
        normalizeOptional(nome_fantasia),
        normalizeOptional(bairro),
        normalizeOptional(cidade),
        normalizeOptional(cep),
        normalizeOptional(inscricao_estadual)
      ]
    );
    
    const cliente = await dbGet('SELECT * FROM clientes WHERE id = ?', [result.id]);
    res.status(201).json(cliente);
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(400).json({ error: 'CPF/CNPJ já cadastrado' });
    }
    res.status(500).json({ error: err.message });
  }
};

// Atualizar cliente
export const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nome, email, telefone, cpf_cnpj, endereco, ativo,
      razao_social, nome_fantasia, bairro, cidade, cep, inscricao_estadual
    } = req.body;
    
    const cliente = await dbGet('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const nextNome = nome !== undefined ? normalizeRequired(nome) : cliente.nome;
    const nextCpfCnpj = cpf_cnpj !== undefined ? normalizeRequired(cpf_cnpj) : cliente.cpf_cnpj;

    if (!nextNome) {
      return res.status(400).json({ error: 'Campo "nome" é obrigatório' });
    }

    if (!nextCpfCnpj) {
      return res.status(400).json({ error: 'Campo "CPF/CNPJ" é obrigatório' });
    }
    
    await dbRun(
      `UPDATE clientes SET 
        nome = ?, email = ?, telefone = ?, cpf_cnpj = ?, endereco = ?, ativo = ?,
        razao_social = ?, nome_fantasia = ?, bairro = ?, cidade = ?, cep = ?, inscricao_estadual = ?
      WHERE id = ?`,
      [
        nextNome,
        email !== undefined ? normalizeOptional(email) : cliente.email,
        telefone !== undefined ? normalizeOptional(telefone) : cliente.telefone,
        nextCpfCnpj,
        endereco !== undefined ? normalizeOptional(endereco) : cliente.endereco,
        ativo !== undefined ? ativo : cliente.ativo,
        razao_social !== undefined ? normalizeOptional(razao_social) : cliente.razao_social,
        nome_fantasia !== undefined ? normalizeOptional(nome_fantasia) : cliente.nome_fantasia,
        bairro !== undefined ? normalizeOptional(bairro) : cliente.bairro,
        cidade !== undefined ? normalizeOptional(cidade) : cliente.cidade,
        cep !== undefined ? normalizeOptional(cep) : cliente.cep,
        inscricao_estadual !== undefined ? normalizeOptional(inscricao_estadual) : cliente.inscricao_estadual,
        id
      ]
    );
    
    const clienteAtualizado = await dbGet('SELECT * FROM clientes WHERE id = ?', [id]);
    res.json(clienteAtualizado);
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(400).json({ error: 'CPF/CNPJ já cadastrado' });
    }
    res.status(500).json({ error: err.message });
  }
};

// Deletar cliente (soft delete)
export const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    
    const cliente = await dbGet('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    await dbRun('UPDATE clientes SET ativo = false WHERE id = ?', [id]);
    res.json({ message: 'Cliente deletado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
