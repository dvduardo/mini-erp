import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../config/database.js', () => ({
  dbRun: vi.fn(),
  dbGet: vi.fn(),
  dbAll: vi.fn(),
  default: {}
}));

import { dbRun, dbGet, dbAll } from '../config/database.js';
import {
  getPedidos,
  getPedidoById,
  createPedido,
  updatePedido,
  deletePedido
} from '../controllers/pedidoController.js';

const createReq = (params = {}, body = {}) => ({ params, body });
const createRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const pedidoBase = {
  id: 1,
  cliente_id: 10,
  numero_pedido: 'PED-001',
  status: 'pendente',
  total_pedido: 500.00,
  cliente_nome: 'Empresa A',
  email: 'a@a.com',
  telefone: '11999'
};

describe('pedidoController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getPedidos ───────────────────────────────────────────────────────────────
  describe('getPedidos', () => {
    it('retorna lista de pedidos com dados do cliente', async () => {
      dbAll.mockResolvedValue([pedidoBase]);

      const req = createReq();
      const res = createRes();
      await getPedidos(req, res);

      expect(dbAll).toHaveBeenCalledOnce();
      expect(res.json).toHaveBeenCalledWith([pedidoBase]);
    });

    it('retorna 500 em caso de erro', async () => {
      dbAll.mockRejectedValue(new Error('DB error'));

      const req = createReq();
      const res = createRes();
      await getPedidos(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });

  // ── getPedidoById ────────────────────────────────────────────────────────────
  describe('getPedidoById', () => {
    it('retorna pedido com produtos, boletos e nota fiscal', async () => {
      const produtos = [{ id: 1, produto_receber: 'Produto X' }];
      const boletos = [{ id: 1, valor: 100 }];
      const notaFiscal = { id: 1, numero_nota_fiscal: 'NF-001' };

      dbGet.mockResolvedValueOnce(pedidoBase);
      dbAll
        .mockResolvedValueOnce(produtos)
        .mockResolvedValueOnce(boletos);
      dbGet.mockResolvedValueOnce(notaFiscal);

      const req = createReq({ id: '1' });
      const res = createRes();
      await getPedidoById(req, res);

      expect(res.json).toHaveBeenCalledWith({
        ...pedidoBase,
        produtos,
        boletos,
        notaFiscal
      });
    });

    it('retorna pedido com notaFiscal null quando não existe', async () => {
      dbGet.mockResolvedValueOnce(pedidoBase);
      dbAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      dbGet.mockResolvedValueOnce(undefined);

      const req = createReq({ id: '1' });
      const res = createRes();
      await getPedidoById(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.notaFiscal).toBeNull();
    });

    it('retorna 404 quando pedido não existe', async () => {
      dbGet.mockResolvedValueOnce(undefined);

      const req = createReq({ id: '999' });
      const res = createRes();
      await getPedidoById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Pedido não encontrado' });
    });

    it('retorna 500 em caso de erro', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));

      const req = createReq({ id: '1' });
      const res = createRes();
      await getPedidoById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── createPedido ─────────────────────────────────────────────────────────────
  describe('createPedido', () => {
    it('cria pedido com sucesso', async () => {
      const cliente = { id: 10, nome: 'Empresa A' };
      dbGet.mockResolvedValueOnce(cliente).mockResolvedValueOnce(pedidoBase);
      dbRun.mockResolvedValue({ id: 1 });

      const req = createReq({}, {
        cliente_id: 10,
        numero_pedido: 'PED-001',
        data_emissao: '2024-01-01',
        data_entrega: '2024-02-01',
        total_pedido: 500
      });
      const res = createRes();
      await createPedido(req, res);

      expect(dbRun).toHaveBeenCalledOnce();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(pedidoBase);
    });

    it('usa endereço do cliente como fallback ao criar pedido', async () => {
      const cliente = {
        id: 10,
        nome: 'Empresa A',
        endereco: 'Rua Central, 100',
        bairro: 'Centro',
        cidade: 'Sao Paulo',
        cep: '01000-000'
      };
      dbGet.mockResolvedValueOnce(cliente).mockResolvedValueOnce(pedidoBase);
      dbRun.mockResolvedValue({ id: 1 });

      const req = createReq({}, {
        cliente_id: 10,
        numero_pedido: 'PED-003'
      });
      const res = createRes();
      await createPedido(req, res);

      const callArgs = dbRun.mock.calls[0][1];
      expect(callArgs[5]).toBe('Rua Central, 100');
      expect(callArgs[6]).toBe('Centro');
      expect(callArgs[7]).toBe('Sao Paulo');
      expect(callArgs[8]).toBe('01000-000');
    });

    it('mantém endereço enviado no pedido quando ele já foi preenchido manualmente', async () => {
      const cliente = {
        id: 10,
        nome: 'Empresa A',
        endereco: 'Rua Cliente, 100',
        bairro: 'Centro',
        cidade: 'Sao Paulo',
        cep: '01000-000'
      };
      dbGet.mockResolvedValueOnce(cliente).mockResolvedValueOnce(pedidoBase);
      dbRun.mockResolvedValue({ id: 1 });

      const req = createReq({}, {
        cliente_id: 10,
        numero_pedido: 'PED-004',
        endereco_entrega: 'Rua Entrega, 999',
        bairro_entrega: 'Bairro Novo',
        cidade_entrega: 'Campinas',
        cep_entrega: '13000-000'
      });
      const res = createRes();
      await createPedido(req, res);

      const callArgs = dbRun.mock.calls[0][1];
      expect(callArgs[5]).toBe('Rua Entrega, 999');
      expect(callArgs[6]).toBe('Bairro Novo');
      expect(callArgs[7]).toBe('Campinas');
      expect(callArgs[8]).toBe('13000-000');
    });

    it('usa data_emissao null quando não fornecida', async () => {
      const cliente = { id: 10, nome: 'Empresa A' };
      dbGet.mockResolvedValueOnce(cliente).mockResolvedValueOnce(pedidoBase);
      dbRun.mockResolvedValue({ id: 1 });

      const req = createReq({}, { cliente_id: 10, numero_pedido: 'PED-002' });
      const res = createRes();
      await createPedido(req, res);

      const callArgs = dbRun.mock.calls[0][1];
      expect(callArgs[2]).toBeNull(); // data_emissao deve ser null
    });

    it('retorna 400 quando campos obrigatórios estão ausentes', async () => {
      const req = createReq({}, { numero_pedido: 'PED-001' }); // sem cliente_id
      const res = createRes();
      await createPedido(req, res);

      expect(dbRun).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Campos cliente_id e numero_pedido são obrigatórios'
      });
    });

    it('retorna 404 quando cliente não existe', async () => {
      dbGet.mockResolvedValueOnce(undefined);

      const req = createReq({}, { cliente_id: 999, numero_pedido: 'PED-001' });
      const res = createRes();
      await createPedido(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cliente não encontrado' });
    });

    it('retorna 400 quando número de pedido já existe (UNIQUE constraint)', async () => {
      dbGet.mockResolvedValueOnce({ id: 10 });
      dbRun.mockRejectedValue(new Error('UNIQUE constraint failed: pedidos.numero_pedido'));

      const req = createReq({}, { cliente_id: 10, numero_pedido: 'PED-001' });
      const res = createRes();
      await createPedido(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Número de pedido já existe' });
    });

    it('retorna 500 em caso de erro genérico', async () => {
      dbGet.mockResolvedValueOnce({ id: 10 });
      dbRun.mockRejectedValue(new Error('Unexpected error'));

      const req = createReq({}, { cliente_id: 10, numero_pedido: 'PED-001' });
      const res = createRes();
      await createPedido(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── updatePedido ─────────────────────────────────────────────────────────────
  describe('updatePedido', () => {
    it('atualiza pedido com sucesso', async () => {
      const pedidoAtualizado = { ...pedidoBase, status: 'entregue' };
      dbGet
        .mockResolvedValueOnce(pedidoBase)
        .mockResolvedValueOnce(pedidoAtualizado);
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq({ id: '1' }, { status: 'entregue' });
      const res = createRes();
      await updatePedido(req, res);

      expect(dbRun).toHaveBeenCalledOnce();
      expect(res.json).toHaveBeenCalledWith(pedidoAtualizado);
    });

    it('retorna 404 quando pedido não existe', async () => {
      dbGet.mockResolvedValue(undefined);

      const req = createReq({ id: '999' }, { status: 'entregue' });
      const res = createRes();
      await updatePedido(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Pedido não encontrado' });
    });

    it('mantém valores existentes para campos não enviados', async () => {
      dbGet
        .mockResolvedValueOnce(pedidoBase)
        .mockResolvedValueOnce(pedidoBase);
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq({ id: '1' }, { status: 'entregue' });
      const res = createRes();
      await updatePedido(req, res);

      const callArgs = dbRun.mock.calls[0][1];
      expect(callArgs[0]).toBe('PED-001'); // numero_pedido mantido
    });

    it('retorna 500 em caso de erro', async () => {
      dbGet.mockResolvedValueOnce(pedidoBase);
      dbRun.mockRejectedValue(new Error('DB error'));

      const req = createReq({ id: '1' }, { status: 'entregue' });
      const res = createRes();
      await updatePedido(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('usa valores enviados para todos os campos quando definidos', async () => {
      const pedidoExistente = {
        id: 1,
        cliente_id: 10,
        numero_pedido: 'PED-001',
        data_emissao: '2024-01-01',
        data_entrega: '2024-02-01',
        status: 'pendente',
        observacoes: 'obs antiga',
        endereco_entrega: 'Rua A',
        bairro_entrega: 'Centro',
        cidade_entrega: 'SP',
        cep_entrega: '01000-000',
        total_pedido: 100
      };

      const payload = {
        numero_pedido: 'PED-999',
        data_emissao: '2025-01-10',
        data_entrega: '2025-02-10',
        status: 'entregue',
        observacoes: 'obs nova',
        endereco_entrega: 'Rua B',
        bairro_entrega: 'Bairro B',
        cidade_entrega: 'Campinas',
        cep_entrega: '13000-000',
        total_pedido: 999.99
      };

      dbGet
        .mockResolvedValueOnce(pedidoExistente)
        .mockResolvedValueOnce({ ...pedidoExistente, ...payload });
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq({ id: '1' }, payload);
      const res = createRes();
      await updatePedido(req, res);

      const callArgs = dbRun.mock.calls[0][1];
      expect(callArgs[0]).toBe(payload.numero_pedido);
      expect(callArgs[1]).toBe(payload.data_emissao);
      expect(callArgs[2]).toBe(payload.data_entrega);
      expect(callArgs[3]).toBe(payload.status);
      expect(callArgs[4]).toBe(payload.observacoes);
      expect(callArgs[5]).toBe(payload.endereco_entrega);
      expect(callArgs[6]).toBe(payload.bairro_entrega);
      expect(callArgs[7]).toBe(payload.cidade_entrega);
      expect(callArgs[8]).toBe(payload.cep_entrega);
      expect(callArgs[9]).toBe(payload.total_pedido);
      expect(callArgs[10]).toBe('1');
    });
  });

  // ── deletePedido ─────────────────────────────────────────────────────────────
  describe('deletePedido', () => {
    it('deleta pedido e relacionamentos com sucesso', async () => {
      dbGet.mockResolvedValue(pedidoBase);
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq({ id: '1' });
      const res = createRes();
      await deletePedido(req, res);

      expect(dbRun).toHaveBeenCalledTimes(3); // boletos, notas_fiscais, pedidos
      expect(res.json).toHaveBeenCalledWith({ message: 'Pedido deletado com sucesso' });
    });

    it('retorna 404 quando pedido não existe', async () => {
      dbGet.mockResolvedValue(undefined);

      const req = createReq({ id: '999' });
      const res = createRes();
      await deletePedido(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Pedido não encontrado' });
    });

    it('retorna 500 em caso de erro', async () => {
      dbGet.mockResolvedValue(pedidoBase);
      dbRun.mockRejectedValue(new Error('DB error'));

      const req = createReq({ id: '1' });
      const res = createRes();
      await deletePedido(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });
});
