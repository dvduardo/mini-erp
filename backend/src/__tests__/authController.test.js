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

vi.mock('../config/mail.js', () => ({
  sendPasswordResetEmail: vi.fn()
}));

import { dbRun, dbGet } from '../config/database.js';
import bcryptjs from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../config/mail.js';
import { register, login, logout, me, forgotPassword, resetPassword } from '../controllers/authController.js';

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
    process.env.APP_URL = 'http://localhost:5173';
  });

  // ── register ──────────────────────────────────────────────────────────────────
  describe('register', () => {
    it('retorna 400 se username ou password ausentes', async () => {
      const req = createReq({ username: 'user' });
      const res = createRes();
      await register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Preencha usuário e senha para continuar.' });
    });

    it('retorna 400 se username já existe', async () => {
      dbGet.mockResolvedValue({ id: 'existing-id' });
      const req = createReq({ username: 'user', password: 'pass' });
      const res = createRes();
      await register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Este nome de usuário já está em uso.' });
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
        message: 'Conta criada com sucesso.',
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
      expect(res.json).toHaveBeenCalledWith({ error: 'Não foi possível criar sua conta agora. Tente novamente em instantes.' });
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('retorna 400 se username ou password ausentes', async () => {
      const req = createReq({ username: 'user' });
      const res = createRes();
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Preencha usuário e senha para continuar.' });
    });

    it('retorna 401 se usuário não encontrado', async () => {
      dbGet.mockResolvedValue(null);
      const req = createReq({ username: 'user', password: 'pass' });
      const res = createRes();
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuário ou senha incorretos.' });
    });

    it('retorna 401 se senha inválida', async () => {
      dbGet.mockResolvedValue({ id: 'user-id', password_hash: 'hashed' });
      bcryptjs.compare.mockResolvedValue(false);
      const req = createReq({ username: 'user', password: 'wrong' });
      const res = createRes();
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuário ou senha incorretos.' });
    });

    it('retorna token ao fazer login com sucesso', async () => {
      dbGet.mockResolvedValue({ id: 'user-id', password_hash: 'hashed' });
      bcryptjs.compare.mockResolvedValue(true);

      const req = createReq({ username: 'user', password: 'pass' });
      const res = createRes();
      await login(req, res);

      expect(generateToken).toHaveBeenCalledWith('user-id');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Login realizado com sucesso.',
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
      expect(res.json).toHaveBeenCalledWith({ error: 'Não foi possível fazer login agora. Tente novamente em instantes.' });
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('retorna mensagem de logout', async () => {
      const req = createReq();
      const res = createRes();
      await logout(req, res);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Sessão encerrada com sucesso.'
      });
    });
  });

  describe('forgotPassword', () => {
    it('retorna 400 sem email', async () => {
      const req = createReq({});
      const res = createRes();

      await forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Informe o e-mail cadastrado para continuar.' });
    });

    it('retorna sucesso genérico quando email não existe', async () => {
      dbGet.mockResolvedValue(null);
      const req = createReq({ email: 'naoexiste@teste.com' });
      const res = createRes();

      await forgotPassword(req, res);

      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Se encontrarmos esse e-mail, enviaremos um link para redefinir sua senha.'
      });
    });

    it('gera token, salva hash e envia email', async () => {
      dbGet.mockResolvedValue({ id: 'user-id', username: 'user', email: 'user@test.com' });
      dbRun.mockResolvedValue({});
      const req = createReq({ email: 'user@test.com' });
      const res = createRes();

      await forgotPassword(req, res);

      expect(dbRun).toHaveBeenCalledTimes(1);
      expect(dbRun.mock.calls[0][0]).toContain('reset_password_token');
      expect(dbRun.mock.calls[0][1][0]).toEqual(expect.any(String));
      expect(sendPasswordResetEmail).toHaveBeenCalledWith({
        to: 'user@test.com',
        username: 'user',
        resetUrl: expect.stringContaining('http://localhost:5173?resetToken=')
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Se encontrarmos esse e-mail, enviaremos um link para redefinir sua senha.'
      });
    });

    it('retorna 500 quando APP_URL não está configurada', async () => {
      delete process.env.APP_URL;
      dbGet.mockResolvedValue({ id: 'user-id', username: 'user', email: 'user@test.com' });
      const req = createReq({ email: 'user@test.com' });
      const res = createRes();

      await forgotPassword(req, res);

      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Não foi possível enviar o link de redefinição agora. Tente novamente em instantes.' });
    });

    it('retorna 500 em erro interno', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));
      const req = createReq({ email: 'user@test.com' });
      const res = createRes();

      await forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Não foi possível enviar o link de redefinição agora. Tente novamente em instantes.' });
    });
  });

  describe('resetPassword', () => {
    it('retorna 400 sem token ou senha', async () => {
      const req = createReq({ token: 'abc' });
      const res = createRes();

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Informe o token e a nova senha para continuar.' });
    });

    it('retorna 400 para token inválido', async () => {
      dbGet.mockResolvedValue(null);
      const req = createReq({ token: 'abc', password: 'nova123' });
      const res = createRes();

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Esse link de redefinição é inválido ou já expirou.' });
    });

    it('atualiza senha e limpa token quando válido', async () => {
      dbGet.mockResolvedValue({ id: 'user-id' });
      bcryptjs.hash.mockResolvedValue('hashed-new-pass');
      dbRun.mockResolvedValue({});
      const req = createReq({ token: 'abc', password: 'nova123' });
      const res = createRes();

      await resetPassword(req, res);

      expect(bcryptjs.hash).toHaveBeenCalledWith('nova123', 10);
      expect(dbRun).toHaveBeenCalledWith(
        'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['hashed-new-pass', 'user-id']
      );
      expect(res.json).toHaveBeenCalledWith({ message: 'Senha atualizada com sucesso.' });
    });

    it('retorna 500 em erro interno', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));
      const req = createReq({ token: 'abc', password: 'nova123' });
      const res = createRes();

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Não foi possível redefinir sua senha agora. Tente novamente em instantes.' });
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
      expect(res.json).toHaveBeenCalledWith({ error: 'Não encontramos esse usuário.' });
    });

    it('retorna 500 em caso de erro no banco', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));
      const req = { userId: 'user-id' };
      const res = createRes();
      await me(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Não foi possível carregar os dados da sua conta agora.' });
    });
  });
});
