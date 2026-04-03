import { dbRun, dbGet, dbAll } from '../config/database.js';

// Listar todos os boletos
export const getBoletos = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT b.*, p.numero_pedido, c.nome as cliente_nome
      FROM boletos b
      JOIN pedidos p ON b.pedido_id = p.id
      JOIN clientes c ON p.cliente_id = c.id
    `;
    
    const params = [];
    
    if (status) {
      query += ' WHERE b.status_pagamento = ?';
      params.push(status);
    }
    
    query += ' ORDER BY b.data_vencimento ASC';
    
    const boletos = await dbAll(query, params);
    res.json(boletos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obter boleto por ID
export const getBoletoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const boleto = await dbGet(`
      SELECT b.*, p.numero_pedido, c.nome as cliente_nome
      FROM boletos b
      JOIN pedidos p ON b.pedido_id = p.id
      JOIN clientes c ON p.cliente_id = c.id
      WHERE b.id = ?
    `, [id]);
    
    if (!boleto) {
      return res.status(404).json({ error: 'Boleto não encontrado' });
    }
    
    res.json(boleto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Criar boleto
export const createBoleto = async (req, res) => {
  try {
    const { pedido_id, numero_boleto, valor, data_vencimento } = req.body;
    
    if (!pedido_id || !valor || !data_vencimento) {
      return res.status(400).json({ error: 'Campos pedido_id, valor e data_vencimento são obrigatórios' });
    }
    
    // Verificar se pedido existe
    const pedido = await dbGet('SELECT * FROM pedidos WHERE id = ?', [pedido_id]);
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    const result = await dbRun(
      'INSERT INTO boletos (pedido_id, numero_boleto, valor, data_vencimento) VALUES (?, ?, ?, ?) RETURNING id',
      [pedido_id, numero_boleto, valor, data_vencimento]
    );
    
    const boleto = await dbGet(`
      SELECT b.*, p.numero_pedido, c.nome as cliente_nome
      FROM boletos b
      JOIN pedidos p ON b.pedido_id = p.id
      JOIN clientes c ON p.cliente_id = c.id
      WHERE b.id = ?
    `, [result.id]);
    
    res.status(201).json(boleto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Atualizar boleto (principalmente para marcar como recebido)
export const updateBoleto = async (req, res) => {
  try {
    const { id } = req.params;
    const { numero_boleto, valor, data_vencimento, status_pagamento, data_pagamento } = req.body;
    
    const boleto = await dbGet('SELECT * FROM boletos WHERE id = ?', [id]);
    if (!boleto) {
      return res.status(404).json({ error: 'Boleto não encontrado' });
    }
    
    await dbRun(
      'UPDATE boletos SET numero_boleto = ?, valor = ?, data_vencimento = ?, status_pagamento = ?, data_pagamento = ? WHERE id = ?',
      [
        numero_boleto !== undefined ? numero_boleto : boleto.numero_boleto,
        valor !== undefined ? valor : boleto.valor,
        data_vencimento !== undefined ? data_vencimento : boleto.data_vencimento,
        status_pagamento !== undefined ? status_pagamento : boleto.status_pagamento,
        data_pagamento !== undefined ? data_pagamento : boleto.data_pagamento,
        id
      ]
    );
    
    const boletoAtualizado = await dbGet(`
      SELECT b.*, p.numero_pedido, c.nome as cliente_nome
      FROM boletos b
      JOIN pedidos p ON b.pedido_id = p.id
      JOIN clientes c ON p.cliente_id = c.id
      WHERE b.id = ?
    `, [id]);
    
    res.json(boletoAtualizado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Deletar boleto
export const deleteBoleto = async (req, res) => {
  try {
    const { id } = req.params;
    
    const boleto = await dbGet('SELECT * FROM boletos WHERE id = ?', [id]);
    if (!boleto) {
      return res.status(404).json({ error: 'Boleto não encontrado' });
    }
    
    await dbRun('DELETE FROM boletos WHERE id = ?', [id]);
    res.json({ message: 'Boleto deletado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obter resumo de boletos (para dashboard)
export const getResumo = async (req, res) => {
  try {
    const totalAReceber = await dbGet(
      'SELECT COALESCE(SUM(valor), 0) as total FROM boletos WHERE status_pagamento = ?',
      ['pendente']
    );
    
    const totalRecebido = await dbGet(
      'SELECT COALESCE(SUM(valor), 0) as total FROM boletos WHERE status_pagamento = ?',
      ['recebido']
    );
    
    const totalBoletos = await dbGet(
      'SELECT COALESCE(SUM(valor), 0) as total FROM boletos'
    );
    
    res.json({
      totalAReceber: totalAReceber.total,
      totalRecebido: totalRecebido.total,
      totalGeral: totalBoletos.total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
