import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../config/database.js', () => ({
  dbRun: vi.fn(),
  dbGet: vi.fn(),
  dbAll: vi.fn(),
  default: {}
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn()
  },
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn()
}));

import { dbRun, dbGet, dbAll } from '../config/database.js';
import fs from 'fs';
import {
  getNotasFiscais,
  getNotaFiscalById,
  uploadNotaFiscal,
  deleteNotaFiscal,
  upload
} from '../controllers/notaFiscalController.js';

const createReq = (params = {}, body = {}, query = {}, file = null) => ({ params, body, query, file });
const createRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const notaBase = {
  id: 1,
  pedido_id: 10,
  numero_nota_fiscal: 'NF-001',
  caminho_arquivo: 'uploads/abc123.pdf',
  data_criacao: '2024-01-01',
  data_upload: '2024-01-01'
};

describe('notaFiscalController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fs.existsSync.mockReturnValue(false);
  });

  // ── getNotasFiscais ──────────────────────────────────────────────────────────
  describe('getNotasFiscais', () => {
    it('retorna todas as notas fiscais sem filtro', async () => {
      dbAll.mockResolvedValue([notaBase]);

      const req = createReq({}, {}, {});
      const res = createRes();
      await getNotasFiscais(req, res);

      expect(dbAll).toHaveBeenCalledWith('SELECT * FROM notas_fiscais', []);
      expect(res.json).toHaveBeenCalledWith([notaBase]);
    });

    it('retorna notas filtradas por pedidoId', async () => {
      dbAll.mockResolvedValue([notaBase]);

      const req = createReq({}, {}, { pedidoId: '10' });
      const res = createRes();
      await getNotasFiscais(req, res);

      expect(dbAll).toHaveBeenCalledWith(
        'SELECT * FROM notas_fiscais WHERE pedido_id = ?',
        ['10']
      );
    });

    it('retorna 500 em caso de erro', async () => {
      dbAll.mockRejectedValue(new Error('DB error'));

      const req = createReq({}, {}, {});
      const res = createRes();
      await getNotasFiscais(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });

  // ── getNotaFiscalById ────────────────────────────────────────────────────────
  describe('getNotaFiscalById', () => {
    it('retorna nota fiscal quando encontrada', async () => {
      dbGet.mockResolvedValue(notaBase);

      const req = createReq({ id: '1' });
      const res = createRes();
      await getNotaFiscalById(req, res);

      expect(dbGet).toHaveBeenCalledWith('SELECT * FROM notas_fiscais WHERE id = ?', ['1']);
      expect(res.json).toHaveBeenCalledWith(notaBase);
    });

    it('retorna 404 quando nota fiscal não existe', async () => {
      dbGet.mockResolvedValue(undefined);

      const req = createReq({ id: '999' });
      const res = createRes();
      await getNotaFiscalById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Nota fiscal não encontrada' });
    });

    it('retorna 500 em caso de erro', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));

      const req = createReq({ id: '1' });
      const res = createRes();
      await getNotaFiscalById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── uploadNotaFiscal ─────────────────────────────────────────────────────────
  describe('uploadNotaFiscal', () => {
    const mockFile = { filename: 'abc123.pdf', originalname: 'nota.pdf' };

    it('faz upload de nota fiscal com sucesso', async () => {
      const pedido = { id: 10 };
      dbGet
        .mockResolvedValueOnce(pedido)    // verificar pedido
        .mockResolvedValueOnce(undefined) // nota existente (não existe)
        .mockResolvedValueOnce(notaBase); // nota criada
      dbRun.mockResolvedValue({ id: 1 });

      const req = createReq({}, { pedido_id: 10, numero_nota_fiscal: 'NF-001' }, {}, mockFile);
      const res = createRes();
      await uploadNotaFiscal(req, res);

      expect(dbRun).toHaveBeenCalledOnce();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Nota fiscal enviada com sucesso',
        nota: notaBase
      });
    });

    it('substitui nota fiscal anterior se existir', async () => {
      const pedido = { id: 10 };
      const notaExistente = { ...notaBase, caminho_arquivo: 'uploads/antigo.pdf' };

      dbGet
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce(notaExistente) // nota existente encontrada
        .mockResolvedValueOnce(notaBase);     // nova nota criada
      dbRun.mockResolvedValue({ id: 2 });
      fs.existsSync.mockReturnValue(true);

      const req = createReq({}, { pedido_id: 10, numero_nota_fiscal: 'NF-002' }, {}, mockFile);
      const res = createRes();
      await uploadNotaFiscal(req, res);

      expect(fs.unlinkSync).toHaveBeenCalledOnce();
      expect(dbRun).toHaveBeenCalledTimes(2); // delete antigo + insert novo
    });

    it('não chama unlinkSync quando arquivo anterior não existe no disco', async () => {
      const pedido = { id: 10 };
      const notaExistente = { ...notaBase, caminho_arquivo: 'uploads/antigo.pdf' };

      dbGet
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce(notaExistente)
        .mockResolvedValueOnce(notaBase);
      dbRun.mockResolvedValue({ id: 2 });
      fs.existsSync.mockReturnValue(false); // arquivo não existe no disco

      const req = createReq({}, { pedido_id: 10 }, {}, mockFile);
      const res = createRes();
      await uploadNotaFiscal(req, res);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('retorna 400 quando nenhum arquivo foi enviado', async () => {
      const req = createReq({}, { pedido_id: 10 }, {}, null);
      const res = createRes();
      await uploadNotaFiscal(req, res);

      expect(dbGet).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Nenhum arquivo foi enviado' });
    });

    it('retorna 400 quando pedido_id está ausente', async () => {
      const req = createReq({}, {}, {}, mockFile);
      const res = createRes();
      await uploadNotaFiscal(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Campo pedido_id é obrigatório' });
    });

    it('retorna 404 quando pedido não existe', async () => {
      dbGet.mockResolvedValueOnce(undefined);

      const req = createReq({}, { pedido_id: 999 }, {}, mockFile);
      const res = createRes();
      await uploadNotaFiscal(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Pedido não encontrado' });
    });

    it('retorna 500 em caso de erro genérico', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));

      const req = createReq({}, { pedido_id: 10 }, {}, mockFile);
      const res = createRes();
      await uploadNotaFiscal(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── deleteNotaFiscal ─────────────────────────────────────────────────────────
  describe('deleteNotaFiscal', () => {
    it('deleta nota fiscal e arquivo com sucesso', async () => {
      dbGet.mockResolvedValue(notaBase);
      dbRun.mockResolvedValue({ changes: 1 });
      fs.existsSync.mockReturnValue(true);

      const req = createReq({ id: '1' });
      const res = createRes();
      await deleteNotaFiscal(req, res);

      expect(fs.unlinkSync).toHaveBeenCalledOnce();
      expect(dbRun).toHaveBeenCalledWith('DELETE FROM notas_fiscais WHERE id = ?', ['1']);
      expect(res.json).toHaveBeenCalledWith({ message: 'Nota fiscal deletada com sucesso' });
    });

    it('deleta nota fiscal sem apagar arquivo quando não existe no disco', async () => {
      dbGet.mockResolvedValue(notaBase);
      dbRun.mockResolvedValue({ changes: 1 });
      fs.existsSync.mockReturnValue(false);

      const req = createReq({ id: '1' });
      const res = createRes();
      await deleteNotaFiscal(req, res);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(dbRun).toHaveBeenCalledOnce();
    });

    it('retorna 404 quando nota fiscal não existe', async () => {
      dbGet.mockResolvedValue(undefined);

      const req = createReq({ id: '999' });
      const res = createRes();
      await deleteNotaFiscal(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Nota fiscal não encontrada' });
    });

    it('retorna 500 em caso de erro', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));

      const req = createReq({ id: '1' });
      const res = createRes();
      await deleteNotaFiscal(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── Multer callbacks (storage + fileFilter) ──────────────────────────────────
  describe('upload middleware (multer storage e fileFilter)', () => {
    it('multer storage: cria diretório de uploads quando não existe', () => {
      fs.existsSync.mockReturnValue(false);
      const cb = vi.fn();
      upload.storage.getDestination({}, {}, cb);
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(cb).toHaveBeenCalledWith(null, expect.any(String));
    });

    it('multer storage: não cria diretório quando já existe', () => {
      fs.existsSync.mockReturnValue(true);
      const cb = vi.fn();
      upload.storage.getDestination({}, {}, cb);
      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(cb).toHaveBeenCalledWith(null, expect.any(String));
    });

    it('multer storage: gera nome de arquivo com UUID e extensão original', () => {
      const cb = vi.fn();
      upload.storage.getFilename({}, { originalname: 'nota.pdf' }, cb);
      const [err, filename] = cb.mock.calls[0];
      expect(err).toBeNull();
      expect(filename).toMatch(/\.pdf$/);
    });

    it('multer fileFilter: aceita arquivos PDF', () => {
      const cb = vi.fn();
      upload.fileFilter({}, { mimetype: 'application/pdf' }, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('multer fileFilter: rejeita arquivos não-PDF', () => {
      const cb = vi.fn();
      upload.fileFilter({}, { mimetype: 'image/png' }, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
    });
  });
});
