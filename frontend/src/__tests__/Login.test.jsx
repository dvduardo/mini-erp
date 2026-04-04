import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockForgotPassword = vi.fn();
const mockResetPassword = vi.fn();
const mockClearError = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    login: mockLogin,
    register: mockRegister,
    forgotPassword: mockForgotPassword,
    resetPassword: mockResetPassword,
    clearError: mockClearError,
    error: null
  }))
}));

vi.mock('../styles/Login.css', () => ({}));

import { useAuth } from '../context/AuthContext';
import Login from '../pages/Login';

describe('Login', () => {
  const onLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
    useAuth.mockReturnValue({
      login: mockLogin,
      register: mockRegister,
      forgotPassword: mockForgotPassword,
      resetPassword: mockResetPassword,
      clearError: mockClearError,
      error: null
    });
  });

  it('renderiza formulário de login por padrão', () => {
    render(<Login onLoginSuccess={onLoginSuccess} />);
    expect(screen.getByText(/Faça seu login/i)).toBeInTheDocument();
    expect(screen.getByText(/Entrar/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Email/i)).not.toBeInTheDocument();
  });

  it('alterna para modo de cadastro ao clicar em "Criar conta"', () => {
    render(<Login onLoginSuccess={onLoginSuccess} />);
    fireEvent.click(screen.getByText(/Criar conta/i));
    expect(screen.getByText(/Crie sua conta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  it('alterna de volta para login ao clicar em "Fazer login"', () => {
    render(<Login onLoginSuccess={onLoginSuccess} />);
    fireEvent.click(screen.getByText(/Criar conta/i));
    fireEvent.click(screen.getByText(/Fazer login/i));
    expect(screen.getByText(/Faça seu login/i)).toBeInTheDocument();
  });

  it('chama login e onLoginSuccess ao submeter com sucesso', async () => {
    mockLogin.mockResolvedValue(true);
    render(<Login onLoginSuccess={onLoginSuccess} />);

    fireEvent.change(screen.getByLabelText(/Usuário/i), { target: { name: 'username', value: 'user' } });
    fireEvent.change(screen.getByLabelText(/Senha/i), { target: { name: 'password', value: 'pass' } });
    fireEvent.submit(screen.getByText(/Entrar/).closest('form'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user', 'pass');
      expect(onLoginSuccess).toHaveBeenCalled();
    });
  });

  it('não chama onLoginSuccess quando login falha', async () => {
    mockLogin.mockResolvedValue(false);
    render(<Login onLoginSuccess={onLoginSuccess} />);

    fireEvent.change(screen.getByLabelText(/Usuário/i), { target: { name: 'username', value: 'user' } });
    fireEvent.change(screen.getByLabelText(/Senha/i), { target: { name: 'password', value: 'wrong' } });
    fireEvent.submit(screen.getByText(/Entrar/).closest('form'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(onLoginSuccess).not.toHaveBeenCalled();
    });
  });

  it('chama register e onLoginSuccess em modo de cadastro', async () => {
    mockRegister.mockResolvedValue(true);
    render(<Login onLoginSuccess={onLoginSuccess} />);

    fireEvent.click(screen.getByText(/Criar conta/i));
    fireEvent.change(screen.getByLabelText(/Usuário/i), { target: { name: 'username', value: 'newuser' } });
    fireEvent.change(screen.getByLabelText(/Senha/i), { target: { name: 'password', value: 'pass' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { name: 'email', value: 'a@b.com' } });
    fireEvent.submit(screen.getByText(/Criar Conta/).closest('form'));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('newuser', 'pass', 'a@b.com');
      expect(onLoginSuccess).toHaveBeenCalled();
    });
  });

  it('exibe mensagem de erro quando useAuth retorna erro', () => {
    useAuth.mockReturnValue({
      login: mockLogin,
      register: mockRegister,
      forgotPassword: mockForgotPassword,
      resetPassword: mockResetPassword,
      clearError: mockClearError,
      error: 'Credenciais inválidas'
    });
    render(<Login onLoginSuccess={onLoginSuccess} />);
    expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument();
  });

  it('abre fluxo de recuperação e envia email informado', async () => {
    mockForgotPassword.mockResolvedValue('Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.');
    render(<Login onLoginSuccess={onLoginSuccess} />);

    fireEvent.click(screen.getByText(/Esqueci minha senha/i));
    fireEvent.change(screen.getByLabelText(/Email cadastrado/i), { target: { name: 'email', value: 'a@b.com' } });
    fireEvent.submit(screen.getByText(/Enviar link/i).closest('form'));

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('a@b.com');
      expect(screen.getByText(/enviaremos um link/i)).toBeInTheDocument();
    });
  });

  it('abre fluxo de reset por token na url e redefine senha', async () => {
    mockResetPassword.mockResolvedValue('Senha redefinida com sucesso');
    window.history.replaceState({}, '', '/?resetToken=abc123');
    render(<Login onLoginSuccess={onLoginSuccess} />);

    expect(screen.getByText(/Cadastre sua nova senha/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { name: 'password', value: 'nova123' } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { name: 'confirmPassword', value: 'nova123' } });
    fireEvent.submit(screen.getByText(/Salvar nova senha/i).closest('form'));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('abc123', 'nova123');
      expect(screen.getByText(/Faça seu login/i)).toBeInTheDocument();
    });
  });
});
