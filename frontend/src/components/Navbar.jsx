import React from 'react';

function Navbar({ currentPage, onNavigate }) {
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
      </ul>
    </nav>
  );
}

export default Navbar;
