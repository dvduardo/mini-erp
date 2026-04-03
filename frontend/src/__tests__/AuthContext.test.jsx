import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';

// Mock localStorage (not available in this jsdom context)
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    _reset: () => { store = {}; }
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

vi.mock('../services/api', () => ({
  authAPI: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn()
  }
}));

import { authAPI } from '../services/api';
import { AuthProvider, useAuth } from '../context/AuthContext';

function TestConsumer() {
  const { user, loading, error, isAuthenticated, login, register, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user ? user.username : 'null'}</span>
      <span data-testid="error">{error || 'null'}</span>
      <button onClick={() => login('user', 'pass')}>login</button>
      <button onClick={() => register('user', 'pass', 'a@b.com')}>register</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock._reset();
  });

  it('inicia com loading=true e sem usuário, termina loading=false quando não há token', async () => {
    authAPI.me.mockResolvedValue({ data: { id: '1', username: 'user' } });
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('restaura usuário a partir do token armazenado no localStorage', async () => {
    localStorage.setItem('authToken', 'stored-token');
    authAPI.me.mockResolvedValue({ data: { id: '1', username: 'stored-user' } });
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('stored-user');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
  });

  it('remove token inválido do localStorage', async () => {
    localStorage.setItem('authToken', 'bad-token');
    authAPI.me.mockRejectedValue(new Error('Unauthorized'));
    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('login com sucesso armazena token e seta usuário', async () => {
    authAPI.me.mockResolvedValue({});
    authAPI.login.mockResolvedValue({ data: { token: 'new-token', user: { id: '2', username: 'testuser' } } });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      screen.getByText('login').click();
    });

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBe('new-token');
      expect(screen.getByTestId('user').textContent).toBe('testuser');
    });
  });

  it('login com falha seta mensagem de erro', async () => {
    authAPI.me.mockResolvedValue({});
    authAPI.login.mockRejectedValue({ response: { data: { error: 'Credenciais inválidas' } } });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      screen.getByText('login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Credenciais inválidas');
    });
  });

  it('register com sucesso armazena token e seta usuário', async () => {
    authAPI.me.mockResolvedValue({});
    authAPI.register.mockResolvedValue({ data: { token: 'reg-token', user: { id: '3', username: 'newuser' } } });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      screen.getByText('register').click();
    });

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBe('reg-token');
      expect(screen.getByTestId('user').textContent).toBe('newuser');
    });
  });

  it('register com falha seta mensagem de erro', async () => {
    authAPI.me.mockResolvedValue({});
    authAPI.register.mockRejectedValue({ response: { data: { error: 'Username já existe' } } });

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      screen.getByText('register').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Username já existe');
    });
  });

  it('logout remove token e limpa usuário', async () => {
    localStorage.setItem('authToken', 'some-token');
    authAPI.me.mockResolvedValue({ data: { id: '1', username: 'user' } });
    authAPI.logout.mockResolvedValue({});

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('user'));

    await act(async () => {
      screen.getByText('logout').click();
    });

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  it('logout continua mesmo se API falhar', async () => {
    localStorage.setItem('authToken', 'some-token');
    authAPI.me.mockResolvedValue({ data: { id: '1', username: 'user' } });
    authAPI.logout.mockRejectedValue(new Error('Network error'));

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('user'));

    await act(async () => {
      screen.getByText('logout').click();
    });

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  it('useAuth lança erro fora do AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth deve ser usado dentro de AuthProvider');
    consoleError.mockRestore();
  });
});
