import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  
  const { login, register, error } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let success = false;
      
      if (isLogin) {
        success = await login(formData.username, formData.password);
      } else {
        success = await register(formData.username, formData.password, formData.email);
      }

      if (success) {
        onLoginSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ username: '', password: '', email: '' });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-hero">
          <span className="login-hero-ornament">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="28" height="28">
              <path d="M50 8 C72 18, 80 44, 72 68 C64 86, 50 92, 50 92 C50 92, 36 86, 28 68 C20 44, 28 18, 50 8 Z"
                    fill="none" stroke="white" strokeWidth="3.5"/>
              <line x1="50" y1="10" x2="50" y2="90" stroke="white" strokeWidth="2"/>
              <path d="M50 28 Q38 35 30 38 M50 44 Q36 50 28 53 M50 60 Q37 65 30 67"
                    stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <path d="M50 28 Q62 35 70 38 M50 44 Q64 50 72 53 M50 60 Q63 65 70 67"
                    stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </span>
          <h1>La Dispensa</h1>
          <p className="tagline">Gestão Artesanal</p>
        </div>

        <div className="login-body">
        <p className="login-subtitle">{isLogin ? 'Faça seu login' : 'Crie sua conta'}</p>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Usuário</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Digite seu usuário"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Digite sua senha"
              required
              disabled={loading}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="email">Email (opcional)</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Digite seu email"
                disabled={loading}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn-login"
            disabled={loading}
          >
            {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            {' '}
            <button
              type="button"
              className="btn-toggle"
              onClick={toggleMode}
              disabled={loading}
            >
              {isLogin ? 'Criar conta' : 'Fazer login'}
            </button>
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
