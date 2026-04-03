import React from 'react';
import { useAuth } from '../context/AuthContext';

function Navbar({ currentPage, onNavigate }) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // Recarregar página para voltar à tela de login
    window.location.reload();
  };

  return (
    <nav>
      <h1>📊 Mini ERP</h1>
      <ul>
        <li>
          <button
            className={currentPage === 'home' ? 'active' : ''}
            onClick={() => onNavigate('home')}
          >
            🏠 Dashboard
          </button>
        </li>
        <li>
          <button
            className={currentPage === 'clientes' ? 'active' : ''}
            onClick={() => onNavigate('clientes')}
          >
            👥 Clientes
          </button>
        </li>
        <li>
          <button
            className={currentPage === 'pedidos' ? 'active' : ''}
            onClick={() => onNavigate('pedidos')}
          >
            📦 Pedidos
          </button>
        </li>
        <li>
          <button
            className={currentPage === 'boletos' ? 'active' : ''}
            onClick={() => onNavigate('boletos')}
          >
            💰 Boletos
          </button>
        </li>
        <li className="nav-user">
          <span>👤 {user?.username}</span>
          <button onClick={handleLogout} className="btn-logout">
            🚪 Sair
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
