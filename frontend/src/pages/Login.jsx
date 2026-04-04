import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LeafIcon from '../components/LeafIcon';
import '../styles/Login.css';

function getInitialMode() {
  const resetToken = new URLSearchParams(window.location.search).get('resetToken');
  return resetToken ? 'reset' : 'login';
}

function Login({ onLoginSuccess }) {
  const [mode, setMode] = useState(getInitialMode);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken') || '');

  const { login, register, forgotPassword, resetPassword, clearError, error } = useAuth();

  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isForgotPassword = mode === 'forgot';
  const isResetPassword = mode === 'reset';

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
    setSuccessMessage(null);
    clearError();

    try {
      let success = false;

      if (isLogin) {
        success = await login(formData.username, formData.password);
      } else if (isRegister) {
        success = await register(formData.username, formData.password, formData.email);
      } else if (isForgotPassword) {
        success = await forgotPassword(formData.email);
        if (success) {
          setSuccessMessage(success);
        }
      } else if (isResetPassword) {
        if (formData.password !== formData.confirmPassword) {
          setSuccessMessage(null);
          return;
        }

        success = await resetPassword(resetToken, formData.password);
        if (success) {
          setSuccessMessage(success);
          setMode('login');
          setResetToken('');
          window.history.replaceState({}, '', window.location.pathname);
        }
      }

      if (success === true) {
        onLoginSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    clearError();
    setSuccessMessage(null);
    setMode(nextMode);
    setFormData({ username: '', password: '', email: '', confirmPassword: '' });

    if (nextMode !== 'reset') {
      setResetToken('');
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const passwordsDoNotMatch = isResetPassword && formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword;
  const subtitle = isLogin
    ? 'Faça seu login'
    : isRegister
      ? 'Crie sua conta'
      : isForgotPassword
        ? 'Receba um link de redefinição'
        : 'Cadastre sua nova senha';

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-hero">
          <span className="login-hero-ornament">
            <LeafIcon color="white" />
          </span>
          <h1>La Dispensa</h1>
          <p className="tagline">Gestão Artesanal</p>
        </div>

        <div className="login-body">
        <p className="login-subtitle">{subtitle}</p>

        <form onSubmit={handleSubmit} className="login-form">
          {successMessage && <div className="success-message">{successMessage}</div>}
          {error && <div className="error-message">{error}</div>}
          {passwordsDoNotMatch && <div className="error-message">As senhas precisam ser iguais.</div>}

          {!isForgotPassword && !isResetPassword && (
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
          )}

          {!isForgotPassword && (
            <div className="form-group">
              <label htmlFor="password">{isResetPassword ? 'Nova senha' : 'Senha'}</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={isResetPassword ? 'Digite sua nova senha' : 'Digite sua senha'}
                required
                disabled={loading}
              />
            </div>
          )}

          {(isRegister || isForgotPassword) && (
            <div className="form-group">
              <label htmlFor="email">{isForgotPassword ? 'Email cadastrado' : 'Email (opcional)'}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={isForgotPassword ? 'Digite o email cadastrado' : 'Digite seu email'}
                required={isForgotPassword}
                disabled={loading}
              />
            </div>
          )}

          {isResetPassword && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar nova senha</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repita a nova senha"
                required
                disabled={loading}
              />
            </div>
          )}

          {isForgotPassword && (
            <p className="helper-message">
              Enviaremos um link seguro para o e-mail informado, se ele estiver cadastrado.
            </p>
          )}

          <button
            type="submit"
            className="btn-login"
            disabled={loading || passwordsDoNotMatch}
          >
            {loading ? 'Aguarde...' : isLogin ? 'Entrar' : isRegister ? 'Criar Conta' : isForgotPassword ? 'Enviar link' : 'Salvar nova senha'}
          </button>
        </form>

        <div className="login-footer">
          {isLogin && (
            <>
              <p>
                Não tem uma conta?
                {' '}
                <button
                  type="button"
                  className="btn-toggle"
                  onClick={() => switchMode('register')}
                  disabled={loading}
                >
                  Criar conta
                </button>
              </p>
              <p className="login-footer-secondary">
                <button
                  type="button"
                  className="btn-toggle"
                  onClick={() => switchMode('forgot')}
                  disabled={loading}
                >
                  Esqueci minha senha
                </button>
              </p>
            </>
          )}

          {isRegister && (
            <p>
              Já tem uma conta?
              {' '}
              <button
                type="button"
                className="btn-toggle"
                onClick={() => switchMode('login')}
                disabled={loading}
              >
                Fazer login
              </button>
            </p>
          )}

          {(isForgotPassword || isResetPassword) && (
            <p>
              Lembrou a senha?
              {' '}
              <button
                type="button"
                className="btn-toggle"
                onClick={() => switchMode('login')}
                disabled={loading}
              >
                Voltar ao login
              </button>
            </p>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
