import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../config/database.js', () => ({
  dbRun: vi.fn(),
  dbGet: vi.fn(),
  dbAll: vi.fn(),
  default: {}
}));

import { dbRun, dbGet, dbAll } from '../config/database.js';
import {
  getBoletos,
  getBoletoById,
  createBoleto,
  updateBoleto,
  deleteBoleto,
  getResumo
} from '../controllers/boletoController.js';

const createReq = (params = {}, body = {}, query = {}) => ({ params, body, query });
const createRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const boletoBase = {
  id: 1,
  pedido_id: 10,
  numero_boleto: 'BOL-001',
  valor: 100.00,
  data_vencimento: '2024-12-01',
  status_pagamento: 'pendente',
  numero_pedido: 'PED-001',
  cliente_nome: 'Empresa A'
};

describe('boletoController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getBoletos ───────────────────────────────────────────────────────────────
  describe('getBoletos', () => {
    it('retorna todos os boletos sem filtro', async () => {
      dbAll.mockResolvedValue([boletoBase]);

      const req = createReq({}, {}, {});
      const res = createRes();
      await getBoletos(req, res);

      expect(dbAll).toHaveBeenCalledWith(expect.not.stringContaining('WHERE'), []);
      expect(res.json).toHaveBeenCalledWith([boletoBase]);
    });

    it('retorna boletos filtrados por status', async () => {
      dbAll.mockResolvedValue([boletoBase]);

      const req = createReq({}, {}, { status: 'pendente' });
      const res = createRes();
      await getBoletos(req, res);

      expect(dbAll).toHaveBeenCalledWith(
        expect.stringContaining('WHERE b.status_pagamento = ?'),
        ['pendente']
      );
    });

    it('retorna 500 em caso de erro', async () => {
      dbAll.mockRejectedValue(new Error('DB error'));

      const req = createReq({}, {}, {});
      const res = createRes();
      await getBoletos(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });

  // ── getBoletoById ────────────────────────────────────────────────────────────
  describe('getBoletoById', () => {
    it('retorna boleto quando encontrado', async () => {
      dbGet.mockResolvedValue(boletoBase);

      const req = createReq({ id: '1' });
      const res = createRes();
      await getBoletoById(req, res);

      expect(res.json).toHaveBeenCalledWith(boletoBase);
    });

    it('retorna 404 quando boleto não existe', async () => {
      dbGet.mockResolvedValue(undefined);

      const req = createReq({ id: '999' });
      const res = createRes();
      await getBoletoById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Boleto não encontrado' });
    });

    it('retorna 500 em caso de erro', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));

      const req = createReq({ id: '1' });
      const res = createRes();
      await getBoletoById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── createBoleto ─────────────────────────────────────────────────────────────
  describe('createBoleto', () => {
    it('cria boleto com sucesso', async () => {
      const pedido = { id: 10, numero_pedido: 'PED-001' };
      dbGet.mockResolvedValueOnce(pedido).mockResolvedValueOnce(boletoBase);
      dbRun.mockResolvedValue({ id: 1 });

      const req = createReq({}, {
        pedido_id: 10,
        numero_boleto: 'BOL-001',
        valor: 100.00,
        data_vencimento: '2024-12-01'
      });
      const res = createRes();
      await createBoleto(req, res);

      expect(dbRun).toHaveBeenCalledOnce();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(boletoBase);
    });

    it('retorna 400 quando campos obrigatórios estão ausentes', async () => {
      const req = createReq({}, { pedido_id: 10 }); // faltam valor e data_vencimento
      const res = createRes();
      await createBoleto(req, res);

      expect(dbRun).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Campos pedido_id, valor e data_vencimento são obrigatórios'
      });
    });

    it('retorna 404 quando pedido não existe', async () => {
      dbGet.mockResolvedValueOnce(undefined);

      const req = createReq({}, { pedido_id: 999, valor: 100, data_vencimento: '2024-12-01' });
      const res = createRes();
      await createBoleto(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Pedido não encontrado' });
    });

    it('retorna 500 em caso de erro genérico', async () => {
      dbGet.mockResolvedValueOnce({ id: 10 });
      dbRun.mockRejectedValue(new Error('DB error'));

      const req = createReq({}, { pedido_id: 10, valor: 100, data_vencimento: '2024-12-01' });
      const res = createRes();
      await createBoleto(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── updateBoleto ─────────────────────────────────────────────────────────────
  describe('updateBoleto', () => {
    it('atualiza boleto com sucesso', async () => {
      const boletoAtualizado = { ...boletoBase, status_pagamento: 'recebido' };
      dbGet
        .mockResolvedValueOnce(boletoBase)
        .mockResolvedValueOnce(boletoAtualizado);
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq({ id: '1' }, { status_pagamento: 'recebido', data_pagamento: '2024-11-30' });
      const res = createRes();
      await updateBoleto(req, res);

      expect(dbRun).toHaveBeenCalledOnce();
      expect(res.json).toHaveBeenCalledWith(boletoAtualizado);
    });

    it('mantém valores existentes para campos não enviados', async () => {
      dbGet
        .mockResolvedValueOnce(boletoBase)
        .mockResolvedValueOnce(boletoBase);
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq({ id: '1' }, { status_pagamento: 'recebido' });
      const res = createRes();
      await updateBoleto(req, res);

      const callArgs = dbRun.mock.calls[0][1];
      expect(callArgs[0]).toBe('BOL-001'); // numero_boleto mantido
      expect(callArgs[1]).toBe(100.00); // valor mantido
    });

    it('retorna 404 quando boleto não existe', async () => {
      dbGet.mockResolvedValue(undefined);

      const req = createReq({ id: '999' }, { status_pagamento: 'recebido' });
      const res = createRes();
      await updateBoleto(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Boleto não encontrado' });
    });

    it('retorna 500 em caso de erro', async () => {
      dbGet.mockResolvedValueOnce(boletoBase);
      dbRun.mockRejectedValue(new Error('DB error'));

      const req = createReq({ id: '1' }, { status_pagamento: 'recebido' });
      const res = createRes();
      await updateBoleto(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('usa valores enviados para todos os campos quando definidos', async () => {
      const boletoAtualizado = {
        ...boletoBase,
        numero_boleto: 'BOL-999',
        valor: 999.99,
        data_vencimento: '2025-01-15',
        status_pagamento: 'recebido',
        data_pagamento: '2025-01-10'
      };

      dbGet
        .mockResolvedValueOnce(boletoBase)
        .mockResolvedValueOnce(boletoAtualizado);
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq(
        { id: '1' },
        {
          numero_boleto: 'BOL-999',
          valor: 999.99,
          data_vencimento: '2025-01-15',
          status_pagamento: 'recebido',
          data_pagamento: '2025-01-10'
        }
      );
      const res = createRes();
      await updateBoleto(req, res);

      const callArgs = dbRun.mock.calls[0][1];
      expect(callArgs[0]).toBe('BOL-999');
      expect(callArgs[1]).toBe(999.99);
      expect(callArgs[2]).toBe('2025-01-15');
      expect(callArgs[3]).toBe('recebido');
      expect(callArgs[4]).toBe('2025-01-10');
      expect(callArgs[5]).toBe('1');
    });
  });

  // ── deleteBoleto ─────────────────────────────────────────────────────────────
  describe('deleteBoleto', () => {
    it('deleta boleto com sucesso', async () => {
      dbGet.mockResolvedValue(boletoBase);
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq({ id: '1' });
      const res = createRes();
      await deleteBoleto(req, res);

      expect(dbRun).toHaveBeenCalledWith('DELETE FROM boletos WHERE id = ?', ['1']);
      expect(res.json).toHaveBeenCalledWith({ message: 'Boleto deletado com sucesso' });
    });

    it('retorna 404 quando boleto não existe', async () => {
      dbGet.mockResolvedValue(undefined);

      const req = createReq({ id: '999' });
      const res = createRes();
      await deleteBoleto(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Boleto não encontrado' });
    });

    it('retorna 500 em caso de erro', async () => {
      dbGet.mockResolvedValue(boletoBase);
      dbRun.mockRejectedValue(new Error('DB error'));

      const req = createReq({ id: '1' });
      const res = createRes();
      await deleteBoleto(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getResumo ────────────────────────────────────────────────────────────────
  describe('getResumo', () => {
    it('retorna resumo financeiro correto', async () => {
      dbGet
        .mockResolvedValueOnce({ total: 500 })   // a receber (pendente)
        .mockResolvedValueOnce({ total: 1200 })  // recebido
        .mockResolvedValueOnce({ total: 1700 }); // geral

      const req = createReq();
      const res = createRes();
      await getResumo(req, res);

      expect(res.json).toHaveBeenCalledWith({
        totalAReceber: 500,
        totalRecebido: 1200,
        totalGeral: 1700
      });
    });

    it('retorna zeros quando não há boletos', async () => {
      dbGet
        .mockResolvedValueOnce({ total: 0 })
        .mockResolvedValueOnce({ total: 0 })
        .mockResolvedValueOnce({ total: 0 });

      const req = createReq();
      const res = createRes();
      await getResumo(req, res);

      expect(res.json).toHaveBeenCalledWith({
        totalAReceber: 0,
        totalRecebido: 0,
        totalGeral: 0
      });
    });

    it('retorna 500 em caso de erro', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));

      const req = createReq();
      const res = createRes();
      await getResumo(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });
});
