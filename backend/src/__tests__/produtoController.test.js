import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../config/database.js', () => ({
  dbRun: vi.fn(),
  dbGet: vi.fn(),
  dbAll: vi.fn(),
  default: {}
}));

import { dbRun, dbGet, dbAll } from '../config/database.js';
import {
  getProdutosByPedido,
  getProdutoById,
  createProduto,
  updateProduto,
  deleteProduto
} from '../controllers/produtoController.js';

const createReq = (params = {}, body = {}) => ({ params, body });
const createRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const produtoBase = {
  id: 1,
  pedido_id: 10,
  cod_fornecedor: 'COD-001',
  cod_seq: 1,
  produto_receber: 'Produto X',
  embalagem: 'CX',
  quantidade: 5,
  valor_unitario: 10.00,
  valor_item: 50.00,
  custo_bruto: 45.00,
  valor_icms_st: 2.00
};

describe('produtoController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getProdutosByPedido ──────────────────────────────────────────────────────
  describe('getProdutosByPedido', () => {
    it('retorna produtos do pedido ordenados por cod_seq', async () => {
      dbAll.mockResolvedValue([produtoBase]);

      const req = createReq({ pedido_id: '10' });
      const res = createRes();
      await getProdutosByPedido(req, res);

      expect(dbAll).toHaveBeenCalledWith(
        expect.stringContaining('WHERE pedido_id = ?'),
        ['10']
      );
      expect(res.json).toHaveBeenCalledWith([produtoBase]);
    });

    it('retorna lista vazia quando pedido não tem produtos', async () => {
      dbAll.mockResolvedValue([]);

      const req = createReq({ pedido_id: '10' });
      const res = createRes();
      await getProdutosByPedido(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('retorna 500 em caso de erro', async () => {
      dbAll.mockRejectedValue(new Error('DB error'));

      const req = createReq({ pedido_id: '10' });
      const res = createRes();
      await getProdutosByPedido(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Não foi possível carregar os produtos do pedido agora.' });
    });
  });

  // ── getProdutoById ───────────────────────────────────────────────────────────
  describe('getProdutoById', () => {
    it('retorna produto quando encontrado', async () => {
      dbGet.mockResolvedValue(produtoBase);

      const req = createReq({ id: '1' });
      const res = createRes();
      await getProdutoById(req, res);

      expect(dbGet).toHaveBeenCalledWith(
        'SELECT * FROM pedido_produtos WHERE id = ?',
        ['1']
      );
      expect(res.json).toHaveBeenCalledWith(produtoBase);
    });

    it('retorna 404 quando produto não existe', async () => {
      dbGet.mockResolvedValue(undefined);

      const req = createReq({ id: '999' });
      const res = createRes();
      await getProdutoById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Produto não encontrado' });
    });

    it('retorna 500 em caso de erro', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));

      const req = createReq({ id: '1' });
      const res = createRes();
      await getProdutoById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── createProduto ────────────────────────────────────────────────────────────
  describe('createProduto', () => {
    it('cria produto com sucesso', async () => {
      const pedido = { id: 10 };
      dbGet.mockResolvedValueOnce(pedido).mockResolvedValueOnce(produtoBase);
      dbRun.mockResolvedValue({ id: 1 });

      const req = createReq({}, {
        pedido_id: 10,
        produto_receber: 'Produto X',
        quantidade: 5,
        valor_unitario: 10.00,
        valor_item: 50.00
      });
      const res = createRes();
      await createProduto(req, res);

      expect(dbRun).toHaveBeenCalledOnce();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(produtoBase);
    });

    it('retorna 400 quando campos obrigatórios estão ausentes', async () => {
      const req = createReq({}, {
        pedido_id: 10,
        // falta produto_receber, quantidade, valor_unitario, valor_item
      });
      const res = createRes();
      await createProduto(req, res);

      expect(dbRun).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Preencha produto, quantidade, valor unitário e valor total do item.'
      });
    });

    it('retorna 400 quando valor_unitario é 0 (válido) mas valor_item está ausente', async () => {
      const req = createReq({}, {
        pedido_id: 10,
        produto_receber: 'Produto Y',
        quantidade: 2,
        valor_unitario: 0,
        // valor_item ausente (undefined)
      });
      const res = createRes();
      await createProduto(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 404 quando pedido não existe', async () => {
      dbGet.mockResolvedValueOnce(undefined);

      const req = createReq({}, {
        pedido_id: 999,
        produto_receber: 'Produto X',
        quantidade: 5,
        valor_unitario: 10,
        valor_item: 50
      });
      const res = createRes();
      await createProduto(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Pedido não encontrado' });
    });

    it('retorna 500 em caso de erro genérico', async () => {
      dbGet.mockResolvedValueOnce({ id: 10 });
      dbRun.mockRejectedValue(new Error('DB error'));

      const req = createReq({}, {
        pedido_id: 10,
        produto_receber: 'Produto X',
        quantidade: 5,
        valor_unitario: 10,
        valor_item: 50
      });
      const res = createRes();
      await createProduto(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── updateProduto ────────────────────────────────────────────────────────────
  describe('updateProduto', () => {
    it('atualiza produto com sucesso', async () => {
      const produtoAtualizado = { ...produtoBase, quantidade: 10 };
      dbGet
        .mockResolvedValueOnce(produtoBase)
        .mockResolvedValueOnce(produtoAtualizado);
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq({ id: '1' }, { quantidade: 10 });
      const res = createRes();
      await updateProduto(req, res);

      expect(dbRun).toHaveBeenCalledOnce();
      expect(res.json).toHaveBeenCalledWith(produtoAtualizado);
    });

    it('mantém valores existentes para campos não enviados', async () => {
      dbGet
        .mockResolvedValueOnce(produtoBase)
        .mockResolvedValueOnce(produtoBase);
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq({ id: '1' }, { quantidade: 10 });
      const res = createRes();
      await updateProduto(req, res);

      const callArgs = dbRun.mock.calls[0][1];
      expect(callArgs[0]).toBe('COD-001'); // cod_fornecedor mantido
      expect(callArgs[2]).toBe('Produto X'); // produto_receber mantido
    });

    it('retorna 404 quando produto não existe', async () => {
      dbGet.mockResolvedValue(undefined);

      const req = createReq({ id: '999' }, { quantidade: 10 });
      const res = createRes();
      await updateProduto(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Produto não encontrado' });
    });

    it('retorna 500 em caso de erro', async () => {
      dbGet.mockResolvedValueOnce(produtoBase);
      dbRun.mockRejectedValue(new Error('DB error'));

      const req = createReq({ id: '1' }, { quantidade: 10 });
      const res = createRes();
      await updateProduto(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('usa valores enviados para todos os campos quando definidos', async () => {
      const payload = {
        cod_fornecedor: 'COD-999',
        cod_seq: 99,
        produto_receber: 'Produto Z',
        embalagem: 'UN',
        quantidade: 20,
        valor_unitario: 15.5,
        valor_item: 310,
        custo_bruto: 280,
        valor_icms_st: 12
      };

      dbGet
        .mockResolvedValueOnce(produtoBase)
        .mockResolvedValueOnce({ ...produtoBase, ...payload });
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq({ id: '1' }, payload);
      const res = createRes();
      await updateProduto(req, res);

      const callArgs = dbRun.mock.calls[0][1];
      expect(callArgs[0]).toBe(payload.cod_fornecedor);
      expect(callArgs[1]).toBe(payload.cod_seq);
      expect(callArgs[2]).toBe(payload.produto_receber);
      expect(callArgs[3]).toBe(payload.embalagem);
      expect(callArgs[4]).toBe(payload.quantidade);
      expect(callArgs[5]).toBe(payload.valor_unitario);
      expect(callArgs[6]).toBe(payload.valor_item);
      expect(callArgs[7]).toBe(payload.custo_bruto);
      expect(callArgs[8]).toBe(payload.valor_icms_st);
      expect(callArgs[9]).toBe('1');
    });
  });

  // ── deleteProduto ────────────────────────────────────────────────────────────
  describe('deleteProduto', () => {
    it('deleta produto com sucesso', async () => {
      dbGet.mockResolvedValue(produtoBase);
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq({ id: '1' });
      const res = createRes();
      await deleteProduto(req, res);

      expect(dbRun).toHaveBeenCalledWith('DELETE FROM pedido_produtos WHERE id = ?', ['1']);
      expect(res.json).toHaveBeenCalledWith({ message: 'Produto removido com sucesso.' });
    });

    it('retorna 404 quando produto não existe', async () => {
      dbGet.mockResolvedValue(undefined);

      const req = createReq({ id: '999' });
      const res = createRes();
      await deleteProduto(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Produto não encontrado' });
    });

    it('retorna 500 em caso de erro', async () => {
      dbGet.mockResolvedValue(produtoBase);
      dbRun.mockRejectedValue(new Error('DB error'));

      const req = createReq({ id: '1' });
      const res = createRes();
      await deleteProduto(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Não foi possível remover o produto agora.' });
    });
  });
});
