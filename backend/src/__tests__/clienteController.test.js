import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../config/database.js', () => ({
  dbRun: vi.fn(),
  dbGet: vi.fn(),
  dbAll: vi.fn(),
  default: {}
}));

import { dbRun, dbGet, dbAll } from '../config/database.js';
import {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente
} from '../controllers/clienteController.js';

const createReq = (params = {}, body = {}, query = {}) => ({ params, body, query });
const createRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('clienteController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getClientes ──────────────────────────────────────────────────────────────
  describe('getClientes', () => {
    it('retorna lista de clientes ativos', async () => {
      const clientes = [{ id: 1, nome: 'Empresa A', ativo: 1 }];
      dbAll.mockResolvedValue(clientes);

      const req = createReq();
      const res = createRes();
      await getClientes(req, res);

      // Accept both SQLite (1) and PostgreSQL (true) boolean styles
      expect(dbAll).toHaveBeenCalledWith(expect.stringMatching(/WHERE ativo = (1|true)/));
      expect(res.json).toHaveBeenCalledWith(clientes);
    });

    it('retorna 500 em caso de erro no banco', async () => {
      dbAll.mockRejectedValue(new Error('DB error'));

      const req = createReq();
      const res = createRes();
      await getClientes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Não foi possível carregar a lista de clientes agora.' });
    });
  });

  // ── getClienteById ───────────────────────────────────────────────────────────
  describe('getClienteById', () => {
    it('retorna cliente quando encontrado', async () => {
      const cliente = { id: 1, nome: 'Empresa A' };
      dbGet.mockResolvedValue(cliente);

      const req = createReq({ id: '1' });
      const res = createRes();
      await getClienteById(req, res);

      expect(dbGet).toHaveBeenCalledWith(expect.any(String), ['1']);
      expect(res.json).toHaveBeenCalledWith(cliente);
    });

    it('retorna 404 quando cliente não existe', async () => {
      dbGet.mockResolvedValue(undefined);

      const req = createReq({ id: '999' });
      const res = createRes();
      await getClienteById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cliente não encontrado' });
    });

    it('retorna 500 em caso de erro no banco', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));

      const req = createReq({ id: '1' });
      const res = createRes();
      await getClienteById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Não foi possível carregar os dados do cliente agora.' });
    });
  });

  // ── createCliente ────────────────────────────────────────────────────────────
  describe('createCliente', () => {
    it('cria cliente com sucesso', async () => {
      const novoCliente = { id: 1, nome: 'Empresa Nova', email: 'novo@empresa.com' };
      dbRun.mockResolvedValue({ id: 1 });
      dbGet.mockResolvedValue(novoCliente);

      const req = createReq({}, {
        nome: 'Empresa Nova',
        email: 'novo@empresa.com',
        telefone: '11999999999',
        cpf_cnpj: '12.345.678/0001-00',
        endereco: 'Rua Teste, 123',
        razao_social: 'Empresa Nova LTDA',
        nome_fantasia: 'Empresa Nova',
        bairro: 'Centro',
        cidade: 'São Paulo',
        cep: '01001-000',
        inscricao_estadual: 'IE123'
      });
      const res = createRes();
      await createCliente(req, res);

      expect(dbRun).toHaveBeenCalledOnce();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(novoCliente);
    });

    it('retorna 400 quando nome está ausente', async () => {
      const req = createReq({}, { email: 'sem-nome@empresa.com' });
      const res = createRes();
      await createCliente(req, res);

      expect(dbRun).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Informe o nome do cliente.' });
    });

    it('retorna 400 quando CPF/CNPJ está ausente', async () => {
      const req = createReq({}, { nome: 'Empresa Sem Documento' });
      const res = createRes();
      await createCliente(req, res);

      expect(dbRun).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Informe o CPF ou CNPJ do cliente.' });
    });

    it('retorna 400 quando CPF/CNPJ já existe (UNIQUE constraint)', async () => {
      dbRun.mockRejectedValue(new Error('UNIQUE constraint failed: clientes.cpf_cnpj'));

      const req = createReq({}, { nome: 'Empresa B', cpf_cnpj: '12.345.678/0001-00' });
      const res = createRes();
      await createCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Já existe um cliente cadastrado com este CPF ou CNPJ.' });
    });

    it('retorna 400 quando CPF/CNPJ já existe no PostgreSQL', async () => {
      dbRun.mockRejectedValue(new Error('duplicate key value violates unique constraint "clientes_cpf_cnpj_key"'));

      const req = createReq({}, { nome: 'Empresa B', cpf_cnpj: '12.345.678/0001-00' });
      const res = createRes();
      await createCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Já existe um cliente cadastrado com este CPF ou CNPJ.' });
    });

    it('retorna 500 em caso de erro genérico no banco', async () => {
      dbRun.mockRejectedValue(new Error('Unexpected DB error'));

      const req = createReq({}, { nome: 'Empresa C', cpf_cnpj: '98.765.432/0001-10' });
      const res = createRes();
      await createCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Não foi possível salvar o cliente agora.' });
    });
  });

  // ── updateCliente ────────────────────────────────────────────────────────────
  describe('updateCliente', () => {
    it('atualiza cliente com sucesso', async () => {
      const clienteExistente = { id: 1, nome: 'Empresa A', email: 'a@a.com', cpf_cnpj: '12.345.678/0001-00', ativo: 1 };
      const clienteAtualizado = { id: 1, nome: 'Empresa A Editada', email: 'a@a.com', cpf_cnpj: '12.345.678/0001-00', ativo: 1 };
      dbGet
        .mockResolvedValueOnce(clienteExistente)
        .mockResolvedValueOnce(clienteAtualizado);
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq({ id: '1' }, { nome: 'Empresa A Editada' });
      const res = createRes();
      await updateCliente(req, res);

      expect(dbRun).toHaveBeenCalledOnce();
      expect(res.json).toHaveBeenCalledWith(clienteAtualizado);
    });

    it('retorna 404 quando cliente não existe', async () => {
      dbGet.mockResolvedValue(undefined);

      const req = createReq({ id: '999' }, { nome: 'Empresa X', cpf_cnpj: '12.345.678/0001-00' });
      const res = createRes();
      await updateCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cliente não encontrado' });
    });

    it('mantém valores existentes para campos não enviados', async () => {
      const clienteExistente = {
        id: 1, nome: 'Empresa A', email: 'a@a.com', telefone: '11999',
        cpf_cnpj: '12.345.678/0001-00', endereco: null, ativo: 1, razao_social: null,
        nome_fantasia: null, bairro: null, cidade: null, cep: null, inscricao_estadual: null
      };
      dbGet
        .mockResolvedValueOnce(clienteExistente)
        .mockResolvedValueOnce({ ...clienteExistente, email: 'novo@a.com' });
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq({ id: '1' }, { email: 'novo@a.com' });
      const res = createRes();
      await updateCliente(req, res);

      const callArgs = dbRun.mock.calls[0][1];
      expect(callArgs[0]).toBe('Empresa A'); // nome mantido
    });

    it('retorna 500 em caso de erro no banco', async () => {
      dbGet.mockResolvedValueOnce({ id: 1, nome: 'A', cpf_cnpj: '12.345.678/0001-00' });
      dbRun.mockRejectedValue(new Error('DB error'));

      const req = createReq({ id: '1' }, { nome: 'B', cpf_cnpj: '12.345.678/0001-00' });
      const res = createRes();
      await updateCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('usa valores enviados para todos os campos quando definidos', async () => {
      const clienteExistente = {
        id: 1,
        nome: 'Empresa A',
        email: 'a@a.com',
        telefone: '1111-1111',
        cpf_cnpj: '00.000.000/0001-00',
        endereco: 'Rua A',
        ativo: 1,
        razao_social: 'Empresa A LTDA',
        nome_fantasia: 'Empresa A',
        bairro: 'Centro',
        cidade: 'SP',
        cep: '01000-000',
        inscricao_estadual: 'IE-OLD'
      };

      const payload = {
        nome: 'Empresa B',
        email: 'b@b.com',
        telefone: '2222-2222',
        cpf_cnpj: '11.111.111/0001-11',
        endereco: 'Rua B',
        ativo: 0,
        razao_social: 'Empresa B LTDA',
        nome_fantasia: 'Empresa B',
        bairro: 'Bairro B',
        cidade: 'Campinas',
        cep: '13000-000',
        inscricao_estadual: 'IE-NEW'
      };

      dbGet
        .mockResolvedValueOnce(clienteExistente)
        .mockResolvedValueOnce({ id: 1, ...payload });
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq({ id: '1' }, payload);
      const res = createRes();
      await updateCliente(req, res);

      const callArgs = dbRun.mock.calls[0][1];
      expect(callArgs[0]).toBe(payload.nome);
      expect(callArgs[1]).toBe(payload.email);
      expect(callArgs[2]).toBe(payload.telefone);
      expect(callArgs[3]).toBe(payload.cpf_cnpj);
      expect(callArgs[4]).toBe(payload.endereco);
      expect(callArgs[5]).toBe(payload.ativo);
      expect(callArgs[6]).toBe(payload.razao_social);
      expect(callArgs[7]).toBe(payload.nome_fantasia);
      expect(callArgs[8]).toBe(payload.bairro);
      expect(callArgs[9]).toBe(payload.cidade);
      expect(callArgs[10]).toBe(payload.cep);
      expect(callArgs[11]).toBe(payload.inscricao_estadual);
      expect(callArgs[12]).toBe('1');
    });
  });

  // ── deleteCliente ────────────────────────────────────────────────────────────
  describe('deleteCliente', () => {
    it('realiza soft delete com sucesso', async () => {
      dbGet.mockResolvedValue({ id: 1, nome: 'Empresa A', ativo: 1 });
      dbRun.mockResolvedValue({ changes: 1 });

      const req = createReq({ id: '1' });
      const res = createRes();
      await deleteCliente(req, res);

      // Accept both SQLite (0) and PostgreSQL (false) boolean styles
      expect(dbRun).toHaveBeenCalledWith(expect.stringMatching(/UPDATE clientes SET ativo = (0|false) WHERE id = \?/), ['1']);
      expect(res.json).toHaveBeenCalledWith({ message: 'Cliente removido com sucesso.' });
    });

    it('retorna 404 quando cliente não existe', async () => {
      dbGet.mockResolvedValue(undefined);

      const req = createReq({ id: '999' });
      const res = createRes();
      await deleteCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cliente não encontrado' });
    });

    it('retorna 500 em caso de erro no banco', async () => {
      dbGet.mockResolvedValue({ id: 1 });
      dbRun.mockRejectedValue(new Error('DB error'));

      const req = createReq({ id: '1' });
      const res = createRes();
      await deleteCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Não foi possível remover o cliente agora.' });
    });
  });
});
