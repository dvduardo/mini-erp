import { dbRun, dbGet, dbAll } from '../config/database.js';

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
    
    if (!nome) {
      return res.status(400).json({ error: 'Campo "nome" é obrigatório' });
    }
    
    const result = await dbRun(
      `INSERT INTO clientes (
        nome, email, telefone, cpf_cnpj, endereco,
        razao_social, nome_fantasia, bairro, cidade, cep, inscricao_estadual
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        nome, email, telefone, cpf_cnpj, endereco,
        razao_social, nome_fantasia, bairro, cidade, cep, inscricao_estadual
      ]
    );
    
    const cliente = await dbGet('SELECT * FROM clientes WHERE id = ?', [result.id]);
    res.status(201).json(cliente);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
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
    
    await dbRun(
      `UPDATE clientes SET 
        nome = ?, email = ?, telefone = ?, cpf_cnpj = ?, endereco = ?, ativo = ?,
        razao_social = ?, nome_fantasia = ?, bairro = ?, cidade = ?, cep = ?, inscricao_estadual = ?
      WHERE id = ?`,
      [
        nome !== undefined ? nome : cliente.nome,
        email !== undefined ? email : cliente.email,
        telefone !== undefined ? telefone : cliente.telefone,
        cpf_cnpj !== undefined ? cpf_cnpj : cliente.cpf_cnpj,
        endereco !== undefined ? endereco : cliente.endereco,
        ativo !== undefined ? ativo : cliente.ativo,
        razao_social !== undefined ? razao_social : cliente.razao_social,
        nome_fantasia !== undefined ? nome_fantasia : cliente.nome_fantasia,
        bairro !== undefined ? bairro : cliente.bairro,
        cidade !== undefined ? cidade : cliente.cidade,
        cep !== undefined ? cep : cliente.cep,
        inscricao_estadual !== undefined ? inscricao_estadual : cliente.inscricao_estadual,
        id
      ]
    );
    
    const clienteAtualizado = await dbGet('SELECT * FROM clientes WHERE id = ?', [id]);
    res.json(clienteAtualizado);
  } catch (err) {
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
