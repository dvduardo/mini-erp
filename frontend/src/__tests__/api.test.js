import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const mockState = vi.hoisted(() => ({
  instance: null
}));

vi.hoisted(() => {
  mockState.instance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn()
      },
      response: {
        use: vi.fn()
      }
    }
  };
});

vi.mock('axios', () => ({
  default: { 
    create: vi.fn(() => mockState.instance) 
  }
}));

// Mock window.location.href before importing api
delete window.location;
window.location = { href: '' };

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

import '../services/api.js';
import {
  authAPI,
  clientesAPI,
  pedidosAPI,
  produtosAPI,
  boletosAPI,
  notasFiscaisAPI
} from '../services/api.js';

const mockApi = mockState.instance;

// Capture interceptor handlers from the initial registrations
const requestUseCalls = mockApi.interceptors.request.use.mock.calls;
const responseUseCalls = mockApi.interceptors.response.use.mock.calls;

const requestSuccessHandler = requestUseCalls[0] ? requestUseCalls[0][0] : null;
const requestErrorHandler = requestUseCalls[0] ? requestUseCalls[0][1] : null;
const responseSuccessHandler = responseUseCalls[0] ? responseUseCalls[0][0] : null;
const responseErrorHandler = responseUseCalls[0] ? responseUseCalls[0][1] : null;

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: [] });
    mockApi.post.mockResolvedValue({ data: {} });
    mockApi.put.mockResolvedValue({ data: {} });
    mockApi.delete.mockResolvedValue({ data: {} });
  });

  describe('clientesAPI', () => {
    it('getAll chama GET /clientes', async () => {
      await clientesAPI.getAll();
      expect(mockApi.get).toHaveBeenCalledWith('/clientes');
    });

    it('getById chama GET /clientes/:id', async () => {
      await clientesAPI.getById(1);
      expect(mockApi.get).toHaveBeenCalledWith('/clientes/1');
    });

    it('create chama POST /clientes com dados', async () => {
      const data = { nome: 'Empresa A' };
      await clientesAPI.create(data);
      expect(mockApi.post).toHaveBeenCalledWith('/clientes', data);
    });

    it('update chama PUT /clientes/:id com dados', async () => {
      const data = { nome: 'Empresa B' };
      await clientesAPI.update(1, data);
      expect(mockApi.put).toHaveBeenCalledWith('/clientes/1', data);
    });

    it('delete chama DELETE /clientes/:id', async () => {
      await clientesAPI.delete(1);
      expect(mockApi.delete).toHaveBeenCalledWith('/clientes/1');
    });
  });

  describe('pedidosAPI', () => {
    it('getAll chama GET /pedidos', async () => {
      await pedidosAPI.getAll();
      expect(mockApi.get).toHaveBeenCalledWith('/pedidos');
    });

    it('getById chama GET /pedidos/:id', async () => {
      await pedidosAPI.getById(1);
      expect(mockApi.get).toHaveBeenCalledWith('/pedidos/1');
    });

    it('create chama POST /pedidos', async () => {
      const data = { numero_pedido: 'PED-001', cliente_id: 1 };
      await pedidosAPI.create(data);
      expect(mockApi.post).toHaveBeenCalledWith('/pedidos', data);
    });

    it('update chama PUT /pedidos/:id', async () => {
      const data = { status: 'entregue' };
      await pedidosAPI.update(1, data);
      expect(mockApi.put).toHaveBeenCalledWith('/pedidos/1', data);
    });

    it('delete chama DELETE /pedidos/:id', async () => {
      await pedidosAPI.delete(1);
      expect(mockApi.delete).toHaveBeenCalledWith('/pedidos/1');
    });
  });

  describe('produtosAPI', () => {
    it('getByPedido chama GET /produtos/pedido/:pedido_id', async () => {
      await produtosAPI.getByPedido(10);
      expect(mockApi.get).toHaveBeenCalledWith('/produtos/pedido/10');
    });

    it('getById chama GET /produtos/:id', async () => {
      await produtosAPI.getById(1);
      expect(mockApi.get).toHaveBeenCalledWith('/produtos/1');
    });

    it('create chama POST /produtos', async () => {
      const data = { produto_receber: 'Produto X', pedido_id: 1 };
      await produtosAPI.create(data);
      expect(mockApi.post).toHaveBeenCalledWith('/produtos', data);
    });

    it('update chama PUT /produtos/:id', async () => {
      const data = { quantidade: 10 };
      await produtosAPI.update(1, data);
      expect(mockApi.put).toHaveBeenCalledWith('/produtos/1', data);
    });

    it('delete chama DELETE /produtos/:id', async () => {
      await produtosAPI.delete(1);
      expect(mockApi.delete).toHaveBeenCalledWith('/produtos/1');
    });
  });

  describe('boletosAPI', () => {
    it('getAll sem filtro chama GET /boletos sem params de status', async () => {
      await boletosAPI.getAll();
      expect(mockApi.get).toHaveBeenCalledWith('/boletos', { params: {} });
    });

    it('getAll com filtro inclui status nos params', async () => {
      await boletosAPI.getAll('pendente');
      expect(mockApi.get).toHaveBeenCalledWith('/boletos', { params: { status: 'pendente' } });
    });

    it('getById chama GET /boletos/:id', async () => {
      await boletosAPI.getById(1);
      expect(mockApi.get).toHaveBeenCalledWith('/boletos/1');
    });

    it('create chama POST /boletos', async () => {
      const data = { pedido_id: 1, valor: 100 };
      await boletosAPI.create(data);
      expect(mockApi.post).toHaveBeenCalledWith('/boletos', data);
    });

    it('update chama PUT /boletos/:id', async () => {
      const data = { status_pagamento: 'recebido' };
      await boletosAPI.update(1, data);
      expect(mockApi.put).toHaveBeenCalledWith('/boletos/1', data);
    });

    it('delete chama DELETE /boletos/:id', async () => {
      await boletosAPI.delete(1);
      expect(mockApi.delete).toHaveBeenCalledWith('/boletos/1');
    });

    it('getResumo chama GET /boletos/resumo/financeiro', async () => {
      await boletosAPI.getResumo();
      expect(mockApi.get).toHaveBeenCalledWith('/boletos/resumo/financeiro');
    });
  });

  describe('notasFiscaisAPI', () => {
    it('getAll sem pedidoId chama GET /notas-fiscais sem params', async () => {
      await notasFiscaisAPI.getAll();
      expect(mockApi.get).toHaveBeenCalledWith('/notas-fiscais', { params: {} });
    });

    it('getAll com pedidoId inclui pedidoId nos params', async () => {
      await notasFiscaisAPI.getAll(5);
      expect(mockApi.get).toHaveBeenCalledWith('/notas-fiscais', { params: { pedidoId: 5 } });
    });

    it('getById chama GET /notas-fiscais/:id', async () => {
      await notasFiscaisAPI.getById(1);
      expect(mockApi.get).toHaveBeenCalledWith('/notas-fiscais/1');
    });

    it('upload chama POST /notas-fiscais/upload com multipart/form-data', async () => {
      const formData = new FormData();
      await notasFiscaisAPI.upload(formData);
      expect(mockApi.post).toHaveBeenCalledWith(
        '/notas-fiscais/upload',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    });

    it('delete chama DELETE /notas-fiscais/:id', async () => {
      await notasFiscaisAPI.delete(1);
      expect(mockApi.delete).toHaveBeenCalledWith('/notas-fiscais/1');
    });
  });

  describe('authAPI', () => {
    it('login chama POST /auth/login', async () => {
      await authAPI.login('user', 'pass');
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', { username: 'user', password: 'pass' });
    });

    it('register chama POST /auth/register', async () => {
      await authAPI.register('user', 'pass', 'a@b.com');
      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', { username: 'user', password: 'pass', email: 'a@b.com' });
    });

    it('forgotPassword chama POST /auth/forgot-password', async () => {
      await authAPI.forgotPassword('a@b.com');
      expect(mockApi.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'a@b.com' });
    });

    it('resetPassword chama POST /auth/reset-password', async () => {
      await authAPI.resetPassword('token-123', 'nova123');
      expect(mockApi.post).toHaveBeenCalledWith('/auth/reset-password', { token: 'token-123', password: 'nova123' });
    });

    it('logout chama POST /auth/logout', async () => {
      await authAPI.logout();
      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('me chama GET /auth/me', async () => {
      await authAPI.me();
      expect(mockApi.get).toHaveBeenCalledWith('/auth/me');
    });
  });

  describe('Interceptores', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockClear();
      localStorageMock.removeItem.mockClear();
      window.location.href = '';
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    describe('Request Interceptor', () => {
      it('adiciona token JWT no header quando token existe no localStorage', () => {
        const config = { headers: {} };
        localStorageMock.getItem.mockReturnValue('test-token');

        const result = requestSuccessHandler(config);

        expect(localStorageMock.getItem).toHaveBeenCalledWith('authToken');
        expect(result.headers.Authorization).toBe('Bearer test-token');
      });

      it('não adiciona Authorization quando token não existe no localStorage', () => {
        const config = { headers: {} };
        localStorageMock.getItem.mockReturnValue(null);

        const result = requestSuccessHandler(config);

        expect(localStorageMock.getItem).toHaveBeenCalledWith('authToken');
        expect(result.headers.Authorization).toBeUndefined();
      });

      it('retorna config inalterada quando não há token', () => {
        const config = { headers: {} };
        localStorageMock.getItem.mockReturnValue(null);

        const result = requestSuccessHandler(config);

        expect(result).toEqual(config);
      });

      it('trata erro no interceptor de requisição', async () => {
        const error = new Error('Request error');
        const result = requestErrorHandler(error);

        // Should return a rejected promise
        await expect(result).rejects.toThrow('Request error');
      });
    });

    describe('Response Interceptor', () => {
      it('retorna response quando sucesso', () => {
        const response = { status: 200, data: {} };

        const result = responseSuccessHandler(response);

        expect(result).toEqual(response);
      });

      it('remove token e redireciona para /login em erro 401', async () => {
        const error = {
          response: { status: 401 }
        };

        try {
          await responseErrorHandler(error);
        } catch (e) {
          // Expected to throw
        }

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
        expect(window.location.href).toBe('/login');
      });

      it('rejeita erro quando status não é 401', async () => {
        const error = {
          response: { status: 500, data: {} }
        };

        try {
          await responseErrorHandler(error);
        } catch (e) {
          expect(e).toEqual(error);
        }
      });

      it('rejeita erro quando não há response (erro de rede)', async () => {
        const error = new Error('Network error');

        try {
          await responseErrorHandler(error);
        } catch (e) {
          expect(e).toEqual(error);
        }
      });

      it('rejeita erro quando response existe mas sem status 401', async () => {
        const error = {
          response: { status: 403 }
        };

        try {
          await responseErrorHandler(error);
        } catch (e) {
          expect(e).toEqual(error);
        }

        expect(localStorageMock.removeItem).not.toHaveBeenCalled();
        expect(window.location.href).toBe('');
      });
    });
  });
});
