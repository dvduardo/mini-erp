import { dbRun, dbGet, dbAll } from '../config/database.js';

// Listar produtos de um pedido
export const getProdutosByPedido = async (req, res) => {
  try {
    const { pedido_id } = req.params;

    const produtos = await dbAll(
      'SELECT * FROM pedido_produtos WHERE pedido_id = ? ORDER BY cod_seq',
      [pedido_id]
    );

    res.json(produtos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obter produto específico
export const getProdutoById = async (req, res) => {
  try {
    const { id } = req.params;

    const produto = await dbGet('SELECT * FROM pedido_produtos WHERE id = ?', [id]);

    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(produto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Criar produto no pedido
export const createProduto = async (req, res) => {
  try {
    const { pedido_id, cod_fornecedor, cod_seq, produto_receber, embalagem, quantidade, valor_unitario, valor_item, custo_bruto, valor_icms_st } = req.body;

    if (!pedido_id || !produto_receber || !quantidade || valor_unitario === undefined || valor_item === undefined) {
      return res.status(400).json({
        error: 'Campos obrigatórios: pedido_id, produto_receber, quantidade, valor_unitario, valor_item'
      });
    }

    // Verificar se pedido existe
    const pedido = await dbGet('SELECT * FROM pedidos WHERE id = ?', [pedido_id]);
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const result = await dbRun(
      `INSERT INTO pedido_produtos
       (pedido_id, cod_fornecedor, cod_seq, produto_receber, embalagem, quantidade, valor_unitario, valor_item, custo_bruto, valor_icms_st)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [pedido_id, cod_fornecedor, cod_seq, produto_receber, embalagem, quantidade, valor_unitario, valor_item, custo_bruto, valor_icms_st]
    );

    const produto = await dbGet('SELECT * FROM pedido_produtos WHERE id = ?', [result.id]);
    res.status(201).json(produto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Atualizar produto
export const updateProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const { cod_fornecedor, cod_seq, produto_receber, embalagem, quantidade, valor_unitario, valor_item, custo_bruto, valor_icms_st } = req.body;

    const produto = await dbGet('SELECT * FROM pedido_produtos WHERE id = ?', [id]);
    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    await dbRun(
      `UPDATE pedido_produtos
       SET cod_fornecedor = ?, cod_seq = ?, produto_receber = ?, embalagem = ?,
           quantidade = ?, valor_unitario = ?, valor_item = ?, custo_bruto = ?, valor_icms_st = ?
       WHERE id = ?`,
      [
        cod_fornecedor !== undefined ? cod_fornecedor : produto.cod_fornecedor,
        cod_seq !== undefined ? cod_seq : produto.cod_seq,
        produto_receber !== undefined ? produto_receber : produto.produto_receber,
        embalagem !== undefined ? embalagem : produto.embalagem,
        quantidade !== undefined ? quantidade : produto.quantidade,
        valor_unitario !== undefined ? valor_unitario : produto.valor_unitario,
        valor_item !== undefined ? valor_item : produto.valor_item,
        custo_bruto !== undefined ? custo_bruto : produto.custo_bruto,
        valor_icms_st !== undefined ? valor_icms_st : produto.valor_icms_st,
        id
      ]
    );

    const produtoAtualizado = await dbGet('SELECT * FROM pedido_produtos WHERE id = ?', [id]);
    res.json(produtoAtualizado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Deletar produto
export const deleteProduto = async (req, res) => {
  try {
    const { id } = req.params;

    const produto = await dbGet('SELECT * FROM pedido_produtos WHERE id = ?', [id]);
    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    await dbRun('DELETE FROM pedido_produtos WHERE id = ?', [id]);

    res.json({ message: 'Produto deletado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
