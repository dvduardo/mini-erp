import React from 'react';
import { useAuth } from '../context/AuthContext';
import LeafIcon from './LeafIcon';

function Navbar({ currentPage, onNavigate }) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // Recarregar página para voltar à tela de login
    window.location.reload();
  };

  return (
    <nav>
      <div className="nav-brand">
        <p className="nav-brand-name">La Dispensa</p>
        <p className="nav-brand-tagline">Gestão Artesanal</p>
      </div>
      <ul>
        {[
          { key: 'home',     label: 'Dashboard' },
          { key: 'clientes', label: 'Clientes'  },
          { key: 'pedidos',  label: 'Pedidos'   },
          { key: 'boletos',  label: 'Boletos'   },
        ].map(({ key, label }) => (
          <li key={key}>
            <button
              className={currentPage === key ? 'active' : ''}
              onClick={() => onNavigate(key)}
            >
              {currentPage === key && <LeafIcon className="nav-item-icon" color="currentColor" />}
              {label}
            </button>
          </li>
        ))}
        <li className="nav-user">
          <span>↳ {user?.username}</span>
          <button onClick={handleLogout} className="btn-logout">
            Sair
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
