import React, { useState } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Clientes from './pages/Clientes';
import Pedidos from './pages/Pedidos';
import Boletos from './pages/Boletos';
import Login from './pages/Login';

function AppContent() {
  const {
    isAuthenticated,
    loading,
    error,
    sessionValidationFailed,
    retrySessionValidation,
    clearStoredSession
  } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');

  if (loading) {
    return (
      <div className="app">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (sessionValidationFailed) {
    return (
      <div className="app">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '24px' }}>
          <div style={{ maxWidth: '440px', textAlign: 'center' }}>
            <h1>Não foi possível restaurar sua sessão</h1>
            <p>{error || 'Tivemos um problema para verificar seu acesso salvo neste dispositivo.'}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '20px' }}>
              <button type="button" className="btn-login" onClick={retrySessionValidation}>
                Tentar novamente
              </button>
              <button type="button" className="btn-toggle" onClick={clearStoredSession}>
                Ir para login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setCurrentPage('home')} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'clientes':
        return <Clientes />;
      case 'pedidos':
        return <Pedidos />;
      case 'boletos':
        return <Boletos />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="app">
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
