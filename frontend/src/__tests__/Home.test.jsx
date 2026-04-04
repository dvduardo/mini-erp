import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../services/api', () => ({
  boletosAPI: {
    getResumo: vi.fn(),
    getAll: vi.fn()
  },
  clientesAPI: {
    getAll: vi.fn()
  },
  pedidosAPI: {
    getAll: vi.fn()
  }
}));

import { boletosAPI, clientesAPI, pedidosAPI } from '../services/api';
import Home from '../pages/Home';

describe('Home (Dashboard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDataSuccess = () => {
    boletosAPI.getResumo.mockResolvedValue({
      data: { totalRecebido: 1200.50, totalAReceber: 300.00, totalGeral: 1500.50 }
    });
    clientesAPI.getAll.mockResolvedValue({
      data: [{ id: 1 }, { id: 2 }, { id: 3 }]
    });
    pedidosAPI.getAll.mockResolvedValue({
      data: [{ id: 1 }, { id: 2 }]
    });
  };

  it('exibe estado de carregamento inicialmente', () => {
    boletosAPI.getResumo.mockResolvedValue({ data: { totalRecebido: 0, totalAReceber: 0, totalGeral: 0 } });
    clientesAPI.getAll.mockResolvedValue({ data: [] });
    pedidosAPI.getAll.mockResolvedValue({ data: [] });

    render(<Home />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Carregando dados/i)).toBeInTheDocument();
  });

  it('exibe o dashboard financeiro após carregar', async () => {
    mockDataSuccess();
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Financeiro')).toBeInTheDocument();
    });
  });

  it('exibe total recebido corretamente', async () => {
    mockDataSuccess();
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/Total Recebido/i)).toBeInTheDocument();
      expect(screen.getByText('R$ 1.200,50')).toBeInTheDocument();
    });
  });

  it('exibe total a receber corretamente', async () => {
    mockDataSuccess();
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/Total a Receber/i)).toBeInTheDocument();
      expect(screen.getByText('R$ 300,00')).toBeInTheDocument();
    });
  });

  it('exibe total de boletos corretamente', async () => {
    mockDataSuccess();
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/Total Geral/i)).toBeInTheDocument();
      expect(screen.getByText('R$ 1.500,50')).toBeInTheDocument();
    });
  });

  it('exibe contagem de clientes corretamente', async () => {
    mockDataSuccess();
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/Total de Clientes/i)).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('exibe contagem de pedidos corretamente', async () => {
    mockDataSuccess();
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/Total de Pedidos/i)).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('exibe taxa de recebimento calculada', async () => {
    mockDataSuccess();
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/Taxa de recebimento/i)).toBeInTheDocument();
      // 1200.50 / 1500.50 * 100 = ~80.0%
      expect(screen.getByText(/80\.0%/)).toBeInTheDocument();
    });
  });

  it('exibe taxa de 0% quando totalGeral é zero', async () => {
    boletosAPI.getResumo.mockResolvedValue({
      data: { totalRecebido: 0, totalAReceber: 0, totalGeral: 0 }
    });
    clientesAPI.getAll.mockResolvedValue({ data: [] });
    pedidosAPI.getAll.mockResolvedValue({ data: [] });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/0\.0%/)).toBeInTheDocument();
    });
  });

  it('lida com erro na API sem crashar', async () => {
    boletosAPI.getResumo.mockRejectedValue(new Error('Network error'));
    clientesAPI.getAll.mockResolvedValue({ data: [] });
    pedidosAPI.getAll.mockResolvedValue({ data: [] });

    render(<Home />);

    // Deve sair do estado de loading mesmo com erro
    await waitFor(() => {
      expect(screen.queryByText(/Carregando dados/i)).not.toBeInTheDocument();
    });
  });

  it('exibe valores padrão quando os dados são zero', async () => {
    boletosAPI.getResumo.mockResolvedValue({
      data: { totalRecebido: 0, totalAReceber: 0, totalGeral: 0 }
    });
    clientesAPI.getAll.mockResolvedValue({ data: [] });
    pedidosAPI.getAll.mockResolvedValue({ data: [] });

    render(<Home />);

    await waitFor(() => {
      const zeros = screen.getAllByText('R$ 0,00');
      expect(zeros.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('usa fallback 0.00 quando totais vêm nulos da API', async () => {
    boletosAPI.getResumo.mockResolvedValue({
      data: { totalRecebido: null, totalAReceber: null, totalGeral: null }
    });
    clientesAPI.getAll.mockResolvedValue({ data: [] });
    pedidosAPI.getAll.mockResolvedValue({ data: [] });

    render(<Home />);

    await waitFor(() => {
      const zeros = screen.getAllByText('R$ 0,00');
      expect(zeros.length).toBeGreaterThanOrEqual(3);
    });
  });
});
