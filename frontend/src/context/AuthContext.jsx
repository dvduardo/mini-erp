import React, { createContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar se há token armazenado ao carregar
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Tentar obter dados do usuário com o token armazenado
      authAPI.me()
        .then(response => {
          setUser(response.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao validar token:', err);
          localStorage.removeItem('authToken');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      const response = await authAPI.login(username, password);
      const { token, user } = response.data;
      
      // Armazenar token no localStorage
      localStorage.setItem('authToken', token);
      setUser(user);
      
      return true;
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao fazer login';
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
      
      return true;
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao registrar';
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
      localStorage.removeItem('authToken');
      setUser(null);
    }
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      const response = await authAPI.forgotPassword(email);
      return response.data.message;
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao solicitar redefinição de senha';
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
      const message = err.response?.data?.error || 'Erro ao redefinir senha';
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
    isAuthenticated: !!user
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
