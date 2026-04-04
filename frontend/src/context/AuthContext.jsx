import React, { createContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { getApiErrorMessage } from '../utils/apiError';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionValidationFailed, setSessionValidationFailed] = useState(false);

  const clearStoredSession = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setError(null);
    setSessionValidationFailed(false);
  };

  const validateStoredSession = async () => {
    const token = localStorage.getItem('authToken');

    if (!token) {
      setSessionValidationFailed(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.me();
      setUser(response.data);
      setError(null);
      setSessionValidationFailed(false);
    } catch (err) {
      const status = err.response?.status;

      if (status === 401 || status === 404) {
        clearStoredSession();
      } else {
        console.error('Erro ao validar token:', err);
        setSessionValidationFailed(true);
        setError('Não conseguimos validar sua sessão agora. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('authToken');
      setUser(null);
      setError('Sua sessão expirou. Faça login novamente.');
      setSessionValidationFailed(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  // Verificar se há token armazenado ao carregar
  useEffect(() => {
    validateStoredSession();
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      const response = await authAPI.login(username, password);
      const { token, user } = response.data;
      
      // Armazenar token no localStorage
      localStorage.setItem('authToken', token);
      setUser(user);
      setSessionValidationFailed(false);
      
      return true;
    } catch (err) {
      const message = getApiErrorMessage(err, 'Não foi possível entrar agora. Tente novamente em instantes.', 'Não conseguimos conexão com o servidor para fazer seu login.');
      setError(message);
      return false;
    }
  };

  const register = async (username, password, email) => {
    try {
      setError(null);
      const response = await authAPI.register(username, password, email);
      const { token, user } = response.data;
      
      // Armazenar token no localStorage
      localStorage.setItem('authToken', token);
      setUser(user);
      setSessionValidationFailed(false);
      
      return true;
    } catch (err) {
      const message = getApiErrorMessage(err, 'Não foi possível criar sua conta agora. Tente novamente em instantes.', 'Não conseguimos conexão com o servidor para criar sua conta.');
      setError(message);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    } finally {
      clearStoredSession();
    }
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      const response = await authAPI.forgotPassword(email);
      return response.data.message;
    } catch (err) {
      const message = getApiErrorMessage(err, 'Não foi possível enviar o link de redefinição agora. Tente novamente em instantes.', 'Não conseguimos conexão com o servidor para enviar o link de redefinição.');
      setError(message);
      return false;
    }
  };

  const resetPassword = async (token, password) => {
    try {
      setError(null);
      const response = await authAPI.resetPassword(token, password);
      return response.data.message;
    } catch (err) {
      const message = getApiErrorMessage(err, 'Não foi possível atualizar sua senha agora. Tente novamente em instantes.', 'Não conseguimos conexão com o servidor para atualizar sua senha.');
      setError(message);
      return false;
    }
  };

  const clearError = () => setError(null);

  const value = {
    user,
    loading,
    error,
    login,
    register,
    forgotPassword,
    resetPassword,
    clearError,
    logout,
    isAuthenticated: !!user,
    sessionValidationFailed,
    retrySessionValidation: validateStoredSession,
    clearStoredSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
