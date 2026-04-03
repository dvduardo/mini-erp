import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { username: 'testuser' }, logout: vi.fn() }))
}));

import Navbar from '../components/Navbar';

describe('Navbar', () => {
  const onNavigate = vi.fn();

  it('renderiza o título do sistema', () => {
    render(<Navbar currentPage="home" onNavigate={onNavigate} />);
    expect(screen.getByText(/Mini ERP/i)).toBeInTheDocument();
  });

  it('renderiza todos os links de navegação', () => {
    render(<Navbar currentPage="home" onNavigate={onNavigate} />);
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Clientes/i)).toBeInTheDocument();
    expect(screen.getByText(/Pedidos/i)).toBeInTheDocument();
    expect(screen.getByText(/Boletos/i)).toBeInTheDocument();
  });

  it('aplica classe "active" ao botão da página atual', () => {
    render(<Navbar currentPage="clientes" onNavigate={onNavigate} />);
    const clientesBtn = screen.getByText(/Clientes/i);
    expect(clientesBtn).toHaveClass('active');
  });

  it('não aplica classe "active" aos outros botões', () => {
    render(<Navbar currentPage="clientes" onNavigate={onNavigate} />);
    const dashboardBtn = screen.getByText(/Dashboard/i);
    expect(dashboardBtn).not.toHaveClass('active');
  });

  it('chama onNavigate com "home" ao clicar em Dashboard', () => {
    render(<Navbar currentPage="clientes" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText(/Dashboard/i));
    expect(onNavigate).toHaveBeenCalledWith('home');
  });

  it('chama onNavigate com "clientes" ao clicar em Clientes', () => {
    render(<Navbar currentPage="home" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText(/Clientes/i));
    expect(onNavigate).toHaveBeenCalledWith('clientes');
  });

  it('chama onNavigate com "pedidos" ao clicar em Pedidos', () => {
    render(<Navbar currentPage="home" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText(/Pedidos/i));
    expect(onNavigate).toHaveBeenCalledWith('pedidos');
  });

  it('chama onNavigate com "boletos" ao clicar em Boletos', () => {
    render(<Navbar currentPage="home" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText(/Boletos/i));
    expect(onNavigate).toHaveBeenCalledWith('boletos');
  });

  it('aplica active ao Dashboard quando currentPage é "home"', () => {
    render(<Navbar currentPage="home" onNavigate={onNavigate} />);
    expect(screen.getByText(/Dashboard/i)).toHaveClass('active');
  });

  it('aplica active ao Pedidos quando currentPage é "pedidos"', () => {
    render(<Navbar currentPage="pedidos" onNavigate={onNavigate} />);
    expect(screen.getByText(/Pedidos/i)).toHaveClass('active');
  });

  it('aplica active ao Boletos quando currentPage é "boletos"', () => {
    render(<Navbar currentPage="boletos" onNavigate={onNavigate} />);
    expect(screen.getByText(/Boletos/i)).toHaveClass('active');
  });

  it('chama logout e recarrega página ao clicar em Sair', async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    const { useAuth } = await import('../context/AuthContext');
    useAuth.mockReturnValue({ user: { username: 'testuser' }, logout: mockLogout });

    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', { value: { reload: reloadMock }, writable: true });

    const { fireEvent: fe } = await import('@testing-library/react');
    render(<Navbar currentPage="home" onNavigate={onNavigate} />);
    fe.click(screen.getByText(/Sair/i));

    await vi.waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});
