import { dbRun, dbGet, dbAll } from '../config/database.js';

// Listar todos os pedidos
export const getPedidos = async (req, res) => {
  try {
    const pedidos = await dbAll(`
      SELECT p.*, c.nome as cliente_nome, c.email, c.telefone
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      ORDER BY p.data_criacao DESC
    `);
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obter pedido por ID
export const getPedidoById = async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await dbGet(`
      SELECT p.*, c.nome as cliente_nome, c.email, c.telefone, c.endereco, c.cpf_cnpj
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.id = ?
    `, [id]);

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Buscar produtos do pedido
    const produtos = await dbAll('SELECT * FROM pedido_produtos WHERE pedido_id = ? ORDER BY cod_seq', [id]);

    // Buscar boletos do pedido
    const boletos = await dbAll('SELECT * FROM boletos WHERE pedido_id = ? ORDER BY data_vencimento', [id]);

    // Buscar nota fiscal
    const notaFiscal = await dbGet('SELECT * FROM notas_fiscais WHERE pedido_id = ?', [id]);

    res.json({ ...pedido, produtos, boletos, notaFiscal: notaFiscal || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Criar pedido
export const createPedido = async (req, res) => {
  try {
    const { cliente_id, numero_pedido, data_emissao, data_entrega, observacoes, endereco_entrega, bairro_entrega, cidade_entrega, cep_entrega, total_pedido } = req.body;

    if (!cliente_id || !numero_pedido) {
      return res.status(400).json({ error: 'Campos cliente_id e numero_pedido são obrigatórios' });
    }

    // Verificar se cliente existe
    const cliente = await dbGet('SELECT * FROM clientes WHERE id = ?', [cliente_id]);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const result = await dbRun(
      `INSERT INTO pedidos (cliente_id, numero_pedido, data_emissao, data_entrega, observacoes, endereco_entrega, bairro_entrega, cidade_entrega, cep_entrega, total_pedido)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [cliente_id, numero_pedido, data_emissao || null, data_entrega, observacoes, endereco_entrega, bairro_entrega, cidade_entrega, cep_entrega, total_pedido || 0]
    );

    const pedido = await dbGet(`
      SELECT p.*, c.nome as cliente_nome, c.email, c.telefone
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.id = ?
    `, [result.id]);

    res.status(201).json(pedido);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Número de pedido já existe' });
    }
    res.status(500).json({ error: err.message });
  }
};

// Atualizar pedido
export const updatePedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { numero_pedido, data_emissao, data_entrega, status, observacoes, endereco_entrega, bairro_entrega, cidade_entrega, cep_entrega, total_pedido } = req.body;

    const pedido = await dbGet('SELECT * FROM pedidos WHERE id = ?', [id]);
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    await dbRun(
      `UPDATE pedidos SET numero_pedido = ?, data_emissao = ?, data_entrega = ?, status = ?, observacoes = ?,
       endereco_entrega = ?, bairro_entrega = ?, cidade_entrega = ?, cep_entrega = ?, total_pedido = ?
       WHERE id = ?`,
      [
        numero_pedido !== undefined ? numero_pedido : pedido.numero_pedido,
        data_emissao !== undefined ? data_emissao : pedido.data_emissao,
        data_entrega !== undefined ? data_entrega : pedido.data_entrega,
        status !== undefined ? status : pedido.status,
        observacoes !== undefined ? observacoes : pedido.observacoes,
        endereco_entrega !== undefined ? endereco_entrega : pedido.endereco_entrega,
        bairro_entrega !== undefined ? bairro_entrega : pedido.bairro_entrega,
        cidade_entrega !== undefined ? cidade_entrega : pedido.cidade_entrega,
        cep_entrega !== undefined ? cep_entrega : pedido.cep_entrega,
        total_pedido !== undefined ? total_pedido : pedido.total_pedido,
        id
      ]
    );

    const pedidoAtualizado = await dbGet(`
      SELECT p.*, c.nome as cliente_nome, c.email, c.telefone
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.id = ?
    `, [id]);

    res.json(pedidoAtualizado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Deletar pedido
export const deletePedido = async (req, res) => {
  try {
    const { id } = req.params;
    
    const pedido = await dbGet('SELECT * FROM pedidos WHERE id = ?', [id]);
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    // Deletar boletos e notas fiscais relacionados (cascata)
    await dbRun('DELETE FROM boletos WHERE pedido_id = ?', [id]);
    await dbRun('DELETE FROM notas_fiscais WHERE pedido_id = ?', [id]);
    await dbRun('DELETE FROM pedidos WHERE id = ?', [id]);
    
    res.json({ message: 'Pedido deletado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
