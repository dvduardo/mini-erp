import React, { useState, useEffect } from 'react';
import { boletosAPI, clientesAPI, pedidosAPI } from '../services/api';

function Home() {
  const [resumo, setResumo] = useState({
    totalAReceber: 0,
    totalRecebido: 0,
    totalGeral: 0
  });
  
  const [stats, setStats] = useState({
    clientes: 0,
    pedidos: 0
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Buscar resumo de boletos
      const resumoRes = await boletosAPI.getResumo();
      const resumoData = resumoRes.data || {};
      
      // Garantir que são números
      setResumo({
        totalAReceber: Number(resumoData.totalAReceber) || 0,
        totalRecebido: Number(resumoData.totalRecebido) || 0,
        totalGeral: Number(resumoData.totalGeral) || 0
      });
      
      // Buscar estatísticas gerais
      const clientesRes = await clientesAPI.getAll();
      const pedidosRes = await pedidosAPI.getAll();
      
      setStats({
        clientes: clientesRes.data.length,
        pedidos: pedidosRes.data.length
      });
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      // Setar valores padrão em caso de erro
      setResumo({
        totalAReceber: 0,
        totalRecebido: 0,
        totalGeral: 0
      });
      setStats({
        clientes: 0,
        pedidos: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-header">
        <h2>Dashboard</h2>
        <p className="loading">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard Financeiro</h2>
      </div>

      <div className="dashboard-grid">
        <div className="card positive">
          <h3>Total Recebido</h3>
          <div className="value">R$ {(Number(resumo.totalRecebido) || 0).toFixed(2)}</div>
        </div>

        <div className="card negative">
          <h3>Total a Receber</h3>
          <div className="value">R$ {(Number(resumo.totalAReceber) || 0).toFixed(2)}</div>
        </div>

        <div className="card">
          <h3>Total Geral</h3>
          <div className="value">R$ {(Number(resumo.totalGeral) || 0).toFixed(2)}</div>
        </div>

        <div className="card">
          <h3>Total de Clientes</h3>
          <div className="value">{stats.clientes}</div>
        </div>

        <div className="card">
          <h3>Total de Pedidos</h3>
          <div className="value">{stats.pedidos}</div>
        </div>
      </div>

      <div className="card">
        <h3>Resumo Financeiro</h3>
        <p>
          <strong>Taxa de Recebimento:</strong>{' '}
          {Number(resumo.totalGeral) > 0
            ? ((Number(resumo.totalRecebido) / Number(resumo.totalGeral)) * 100).toFixed(1)
            : 0}
          %
        </p>
      </div>
    </div>
  );
}

export default Home;
