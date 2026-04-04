import React, { useState, useEffect } from 'react';
import { boletosAPI, clientesAPI, pedidosAPI } from '../services/api';
import { formatBRL } from '../utils/format';

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
          <div className="value">R$ {formatBRL(resumo.totalRecebido)}</div>
        </div>

        <div className="card negative">
          <h3>Total a Receber</h3>
          <div className="value">R$ {formatBRL(resumo.totalAReceber)}</div>
        </div>

        <div className="card">
          <h3>Total Geral</h3>
          <div className="value">R$ {formatBRL(resumo.totalGeral)}</div>
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
        {(() => {
          const pct = Number(resumo.totalGeral) > 0
            ? Math.min(100, (Number(resumo.totalRecebido) / Number(resumo.totalGeral)) * 100)
            : 0;
          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Taxa de recebimento</span>
                <span style={{ fontSize: '22px', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-success)' }}>
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                <span>Recebido: R$ {formatBRL(resumo.totalRecebido)}</span>
                <span>Total: R$ {formatBRL(resumo.totalGeral)}</span>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

export default Home;
