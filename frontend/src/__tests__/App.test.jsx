import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock all page components and Navbar to isolate App logic
vi.mock('../pages/Home', () => ({
  default: () => <div data-testid="page-home">Home Page</div>
}));
vi.mock('../pages/Clientes', () => ({
  default: () => <div data-testid="page-clientes">Clientes Page</div>
}));
vi.mock('../pages/Pedidos', () => ({
  default: () => <div data-testid="page-pedidos">Pedidos Page</div>
}));
vi.mock('../pages/Boletos', () => ({
  default: () => <div data-testid="page-boletos">Boletos Page</div>
}));
vi.mock('../components/Navbar', () => ({
  default: ({ currentPage, onNavigate }) => (
    <nav data-testid="navbar">
      <span data-testid="current-page">{currentPage}</span>
      <button onClick={() => onNavigate('home')}>Home</button>
      <button onClick={() => onNavigate('clientes')}>Clientes</button>
      <button onClick={() => onNavigate('pedidos')}>Pedidos</button>
      <button onClick={() => onNavigate('boletos')}>Boletos</button>
    </nav>
  )
}));
vi.mock('../pages/Login', () => ({
  default: () => <div data-testid="page-login">Login Page</div>
}));
vi.mock('../App.css', () => ({}));
vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    loading: false,
    error: null,
    sessionValidationFailed: false,
    retrySessionValidation: vi.fn(),
    clearStoredSession: vi.fn()
  }))
}));

import { useAuth } from '../context/AuthContext';
import App from '../App';

describe('App', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      error: null,
      sessionValidationFailed: false,
      retrySessionValidation: vi.fn(),
      clearStoredSession: vi.fn()
    });
  });

  it('exibe "Carregando..." enquanto loading é true', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
      error: null,
      sessionValidationFailed: false,
      retrySessionValidation: vi.fn(),
      clearStoredSession: vi.fn()
    });
    render(<App />);
    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
  });

  it('exibe Login quando não autenticado', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      error: null,
      sessionValidationFailed: false,
      retrySessionValidation: vi.fn(),
      clearStoredSession: vi.fn()
    });
    render(<App />);
    expect(screen.queryByTestId('navbar')).not.toBeInTheDocument();
  });

  it('exibe estado de recuperacao de sessao quando a validacao falha', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      error: 'Não conseguimos validar sua sessão agora. Tente novamente.',
      sessionValidationFailed: true,
      retrySessionValidation: vi.fn(),
      clearStoredSession: vi.fn()
    });
    render(<App />);
    expect(screen.getByText(/Não foi possível restaurar sua sessão/i)).toBeInTheDocument();
    expect(screen.queryByTestId('page-login')).not.toBeInTheDocument();
  });

  it('aciona retrySessionValidation ao clicar em "Tentar novamente"', () => {
    const retrySessionValidation = vi.fn();
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      error: 'Não conseguimos validar sua sessão agora. Tente novamente.',
      sessionValidationFailed: true,
      retrySessionValidation,
      clearStoredSession: vi.fn()
    });
    render(<App />);
    fireEvent.click(screen.getByText(/Tentar novamente/i));
    expect(retrySessionValidation).toHaveBeenCalled();
  });

  it('permite seguir para login ao clicar em "Ir para login"', () => {
    const clearStoredSession = vi.fn();
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      error: 'Não conseguimos validar sua sessão agora. Tente novamente.',
      sessionValidationFailed: true,
      retrySessionValidation: vi.fn(),
      clearStoredSession
    });
    render(<App />);
    fireEvent.click(screen.getByText(/Ir para login/i));
    expect(clearStoredSession).toHaveBeenCalled();
  });

  it('renderiza a Navbar e a página Home por padrão', () => {
    render(<App />);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('page-home')).toBeInTheDocument();
  });

  it('exibe "home" como página inicial na Navbar', () => {
    render(<App />);
    expect(screen.getByTestId('current-page').textContent).toBe('home');
  });

  it('navega para Clientes ao clicar no botão', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Clientes'));
    expect(screen.getByTestId('page-clientes')).toBeInTheDocument();
    expect(screen.queryByTestId('page-home')).not.toBeInTheDocument();
  });

  it('navega para Pedidos ao clicar no botão', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Pedidos'));
    expect(screen.getByTestId('page-pedidos')).toBeInTheDocument();
  });

  it('navega para Boletos ao clicar no botão', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Boletos'));
    expect(screen.getByTestId('page-boletos')).toBeInTheDocument();
  });

  it('volta para Home ao clicar no botão Home', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Clientes'));
    fireEvent.click(screen.getByText('Home'));
    expect(screen.getByTestId('page-home')).toBeInTheDocument();
  });

  it('passa a página atual para a Navbar', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Pedidos'));
    expect(screen.getByTestId('current-page').textContent).toBe('pedidos');
  });

  it('atualiza a Navbar ao mudar de página', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Boletos'));
    expect(screen.getByTestId('current-page').textContent).toBe('boletos');
    fireEvent.click(screen.getByText('Clientes'));
    expect(screen.getByTestId('current-page').textContent).toBe('clientes');
  });
});
