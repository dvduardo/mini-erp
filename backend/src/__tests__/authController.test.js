import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../config/database.js', () => ({
  dbRun: vi.fn(),
  dbGet: vi.fn(),
  dbAll: vi.fn(),
  default: {}
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn()
  }
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234')
}));

vi.mock('../middleware/auth.js', () => ({
  generateToken: vi.fn(() => 'mocked-token')
}));

import { dbRun, dbGet } from '../config/database.js';
import bcryptjs from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';
import { register, login, logout, me } from '../controllers/authController.js';

const createReq = (body = {}, params = {}) => ({ body, params });
const createRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('authController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── register ──────────────────────────────────────────────────────────────────
  describe('register', () => {
    it('retorna 400 se username ou password ausentes', async () => {
      const req = createReq({ username: 'user' });
      const res = createRes();
      await register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Username e password são obrigatórios' });
    });

    it('retorna 400 se username já existe', async () => {
      dbGet.mockResolvedValue({ id: 'existing-id' });
      const req = createReq({ username: 'user', password: 'pass' });
      const res = createRes();
      await register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Username já existe' });
    });

    it('cria usuário e retorna token com 201', async () => {
      dbGet.mockResolvedValue(null);
      bcryptjs.hash.mockResolvedValue('hashed-pass');
      dbRun.mockResolvedValue({});

      const req = createReq({ username: 'newuser', password: 'pass123', email: 'a@b.com' });
      const res = createRes();
      await register(req, res);

      expect(bcryptjs.hash).toHaveBeenCalledWith('pass123', 10);
      expect(dbRun).toHaveBeenCalled();
      expect(generateToken).toHaveBeenCalledWith('test-uuid-1234');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Usuário criado com sucesso',
        token: 'mocked-token',
        user: { id: 'test-uuid-1234', username: 'newuser', email: 'a@b.com' }
      });
    });

    it('cria usuário sem email (email = null)', async () => {
      dbGet.mockResolvedValue(null);
      bcryptjs.hash.mockResolvedValue('hashed-pass');
      dbRun.mockResolvedValue({});

      const req = createReq({ username: 'newuser', password: 'pass123' });
      const res = createRes();
      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('retorna 500 em caso de erro no banco', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));
      const req = createReq({ username: 'user', password: 'pass' });
      const res = createRes();
      await register(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao registrar usuário' });
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('retorna 400 se username ou password ausentes', async () => {
      const req = createReq({ username: 'user' });
      const res = createRes();
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Username e password são obrigatórios' });
    });

    it('retorna 401 se usuário não encontrado', async () => {
      dbGet.mockResolvedValue(null);
      const req = createReq({ username: 'user', password: 'pass' });
      const res = createRes();
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Credenciais inválidas' });
    });

    it('retorna 401 se senha inválida', async () => {
      dbGet.mockResolvedValue({ id: 'user-id', password_hash: 'hashed' });
      bcryptjs.compare.mockResolvedValue(false);
      const req = createReq({ username: 'user', password: 'wrong' });
      const res = createRes();
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Credenciais inválidas' });
    });

    it('retorna token ao fazer login com sucesso', async () => {
      dbGet.mockResolvedValue({ id: 'user-id', password_hash: 'hashed' });
      bcryptjs.compare.mockResolvedValue(true);

      const req = createReq({ username: 'user', password: 'pass' });
      const res = createRes();
      await login(req, res);

      expect(generateToken).toHaveBeenCalledWith('user-id');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Login bem-sucedido',
        token: 'mocked-token',
        user: { id: 'user-id', username: 'user' }
      });
    });

    it('retorna 500 em caso de erro no banco', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));
      const req = createReq({ username: 'user', password: 'pass' });
      const res = createRes();
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao fazer login' });
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('retorna mensagem de logout', async () => {
      const req = createReq();
      const res = createRes();
      await logout(req, res);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Logout bem-sucedido. Remova o token no cliente.'
      });
    });
  });

  // ── me ────────────────────────────────────────────────────────────────────────
  describe('me', () => {
    it('retorna dados do usuário autenticado', async () => {
      const user = { id: 'user-id', username: 'user', email: 'a@b.com' };
      dbGet.mockResolvedValue(user);

      const req = { userId: 'user-id' };
      const res = createRes();
      await me(req, res);

      expect(res.json).toHaveBeenCalledWith(user);
    });

    it('retorna 404 se usuário não encontrado', async () => {
      dbGet.mockResolvedValue(null);
      const req = { userId: 'missing-id' };
      const res = createRes();
      await me(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuário não encontrado' });
    });

    it('retorna 500 em caso de erro no banco', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));
      const req = { userId: 'user-id' };
      const res = createRes();
      await me(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao buscar usuário' });
    });
  });
});
