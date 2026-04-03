import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../services/api', () => ({
  boletosAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  pedidosAPI: {
    getAll: vi.fn()
  }
}));

import { boletosAPI, pedidosAPI } from '../services/api';
import Boletos from '../pages/Boletos';

const pedidosMock = [
  { id: 1, numero_pedido: 'PED-001', cliente_nome: 'Empresa A' },
  { id: 2, numero_pedido: 'PED-002', cliente_nome: 'Empresa B' }
];

const boletosMock = [
  {
    id: 1,
    pedido_id: 1,
    numero_boleto: 'BOL-001',
    valor: 100.00,
    data_vencimento: '2024-12-01T00:00:00.000Z',
    status_pagamento: 'pendente',
    numero_pedido: 'PED-001',
    cliente_nome: 'Empresa A'
  },
  {
    id: 2,
    pedido_id: 2,
    numero_boleto: null,
    valor: 250.50,
    data_vencimento: '2024-11-15T00:00:00.000Z',
    status_pagamento: 'recebido',
    numero_pedido: 'PED-002',
    cliente_nome: 'Empresa B'
  }
];

describe('Boletos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  const setupMocks = (boletos = boletosMock) => {
    pedidosAPI.getAll.mockResolvedValue({ data: pedidosMock });
    boletosAPI.getAll.mockResolvedValue({ data: boletos });
  };

  it('exibe estado de carregamento inicialmente', () => {
    setupMocks();
    render(<Boletos />);
    expect(screen.getByText(/Carregando boletos/i)).toBeInTheDocument();
  });

  it('exibe lista de boletos após carregar', async () => {
    setupMocks();
    render(<Boletos />);

    await waitFor(() => {
      expect(screen.getByText('BOL-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
    expect(screen.getByText('PED-001')).toBeInTheDocument();
  });

  it('exibe "-" para número de boleto nulo', async () => {
    setupMocks();
    render(<Boletos />);

    await waitFor(() => {
      expect(screen.getByText('BOL-001')).toBeInTheDocument();
    });
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('exibe valores monetários corretamente', async () => {
    setupMocks();
    render(<Boletos />);

    await waitFor(() => {
      expect(screen.getByText('R$ 100.00')).toBeInTheDocument();
      expect(screen.getByText('R$ 250.50')).toBeInTheDocument();
    });
  });

  it('exibe status dos boletos', async () => {
    setupMocks();
    render(<Boletos />);

    await waitFor(() => {
      expect(screen.getByText('pendente')).toBeInTheDocument();
      expect(screen.getByText('recebido')).toBeInTheDocument();
    });
  });

  it('exibe mensagem quando não há boletos', async () => {
    setupMocks([]);
    render(<Boletos />);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum boleto cadastrado/i)).toBeInTheDocument();
    });
  });

  it('abre modal de novo boleto ao clicar no botão', async () => {
    setupMocks();
    render(<Boletos />);

    await waitFor(() => screen.getByText('BOL-001'));
    fireEvent.click(screen.getByText(/\+ Novo Boleto/i));

    expect(screen.getByText('Novo Boleto')).toBeInTheDocument();
  });

  it('fecha modal ao clicar em Cancelar', async () => {
    setupMocks();
    render(<Boletos />);

    await waitFor(() => screen.getByText('BOL-001'));
    fireEvent.click(screen.getByText(/\+ Novo Boleto/i));
    fireEvent.click(screen.getByText('Cancelar'));

    expect(screen.queryByText('Novo Boleto')).not.toBeInTheDocument();
  });

  it('abre modal de edição com dados do boleto', async () => {
    setupMocks();
    render(<Boletos />);

    await waitFor(() => screen.getByText('BOL-001'));
    const editarBtns = screen.getAllByText('Editar');
    fireEvent.click(editarBtns[0]);

    expect(screen.getByText('Editar Boleto')).toBeInTheDocument();
    expect(screen.getByDisplayValue('BOL-001')).toBeInTheDocument();
  });

  it('cria novo boleto com sucesso', async () => {
    setupMocks();
    boletosAPI.create.mockResolvedValue({ data: boletosMock[0] });

    render(<Boletos />);
    await waitFor(() => screen.getByText('BOL-001'));

    fireEvent.click(screen.getByText(/\+ Novo Boleto/i));

    const form = screen.getByText('Salvar').closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(boletosAPI.create).toHaveBeenCalled();
    });
  });

  it('atualiza boleto existente com sucesso', async () => {
    setupMocks();
    boletosAPI.update.mockResolvedValue({ data: boletosMock[0] });

    render(<Boletos />);
    await waitFor(() => screen.getByText('BOL-001'));

    const editarBtns = screen.getAllByText('Editar');
    fireEvent.click(editarBtns[0]);

    const form = screen.getByText('Salvar').closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(boletosAPI.update).toHaveBeenCalledWith(1, expect.any(Object));
    });
  });

  it('deleta boleto com confirmação', async () => {
    setupMocks();
    boletosAPI.delete.mockResolvedValue({});

    render(<Boletos />);
    await waitFor(() => screen.getByText('BOL-001'));

    const deletarBtns = screen.getAllByText('Deletar');
    fireEvent.click(deletarBtns[0]);

    expect(window.confirm).toHaveBeenCalledWith('Tem certeza que deseja deletar este boleto?');
    await waitFor(() => {
      expect(boletosAPI.delete).toHaveBeenCalledWith(1);
    });
  });

  it('não deleta boleto se confirmação for cancelada', async () => {
    window.confirm.mockReturnValue(false);
    setupMocks();

    render(<Boletos />);
    await waitFor(() => screen.getByText('BOL-001'));

    const deletarBtns = screen.getAllByText('Deletar');
    fireEvent.click(deletarBtns[0]);

    expect(boletosAPI.delete).not.toHaveBeenCalled();
  });

  it('alterna status de pagamento ao clicar no checkbox (pendente → recebido)', async () => {
    setupMocks();
    boletosAPI.update.mockResolvedValue({ data: { ...boletosMock[0], status_pagamento: 'recebido' } });

    render(<Boletos />);
    await waitFor(() => screen.getByText('BOL-001'));

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // primeiro boleto está pendente

    await waitFor(() => {
      expect(boletosAPI.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status_pagamento: 'recebido'
      }));
    });
  });

  it('alterna status de pagamento ao clicar no checkbox (recebido → pendente)', async () => {
    setupMocks();
    boletosAPI.update.mockResolvedValue({ data: { ...boletosMock[1], status_pagamento: 'pendente' } });

    render(<Boletos />);
    await waitFor(() => screen.getByText('BOL-001'));

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // segundo boleto está recebido

    await waitFor(() => {
      expect(boletosAPI.update).toHaveBeenCalledWith(2, expect.objectContaining({
        status_pagamento: 'pendente',
        data_pagamento: null
      }));
    });
  });

  it('filtra boletos por status ao mudar o select', async () => {
    setupMocks();
    render(<Boletos />);

    await waitFor(() => screen.getByText('BOL-001'));

    const filtroSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(filtroSelect, { target: { value: 'pendente' } });

    await waitFor(() => {
      expect(boletosAPI.getAll).toHaveBeenCalledWith('pendente');
    });
  });

  it('lida com erro ao salvar boleto', async () => {
    setupMocks();
    boletosAPI.update.mockRejectedValue({
      response: { data: { error: 'Erro interno' } }
    });

    render(<Boletos />);
    await waitFor(() => screen.getByText('BOL-001'));

    const editarBtns = screen.getAllByText('Editar');
    fireEvent.click(editarBtns[0]);

    const form = screen.getByText('Salvar').closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

  it('lida com erro ao deletar boleto', async () => {
    setupMocks();
    boletosAPI.delete.mockRejectedValue(new Error('Network error'));

    render(<Boletos />);
    await waitFor(() => screen.getByText('BOL-001'));

    const deletarBtns = screen.getAllByText('Deletar');
    fireEvent.click(deletarBtns[0]);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Erro ao deletar boleto');
    });
  });

  it('checkboxes de boletos recebidos estão marcados', async () => {
    setupMocks();
    render(<Boletos />);

    await waitFor(() => screen.getByText('BOL-001'));

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0].checked).toBe(false); // pendente
    expect(checkboxes[1].checked).toBe(true);  // recebido
  });

  it('pedido select está desabilitado ao editar boleto', async () => {
    setupMocks();
    render(<Boletos />);

    await waitFor(() => screen.getByText('BOL-001'));

    const editarBtns = screen.getAllByText('Editar');
    fireEvent.click(editarBtns[0]);

    const disabledSelect = screen.getAllByRole('combobox').find(el => el.disabled);
    expect(disabledSelect).toBeTruthy();
    expect(disabledSelect).toBeDisabled();
  });
});
