import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../services/api', () => ({
  clientesAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

import { clientesAPI } from '../services/api';
import Clientes from '../pages/Clientes';

const clientesMock = [
  {
    id: 1,
    nome: 'João Silva',
    nome_fantasia: 'JS Comercio',
    razao_social: 'JS Comercio LTDA',
    cpf_cnpj: '12.345.678/0001-00',
    telefone: '11999990000',
    cidade: 'São Paulo'
  },
  {
    id: 2,
    nome: 'Maria Souza',
    nome_fantasia: null,
    razao_social: null,
    cpf_cnpj: null,
    telefone: null,
    cidade: null
  }
];

describe('Clientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('exibe estado de carregamento inicialmente', () => {
    clientesAPI.getAll.mockResolvedValue({ data: clientesMock });
    render(<Clientes />);
    expect(screen.getByText(/Carregando clientes/i)).toBeInTheDocument();
  });

  it('exibe lista de clientes após carregar', async () => {
    clientesAPI.getAll.mockResolvedValue({ data: clientesMock });
    render(<Clientes />);

    await waitFor(() => {
      expect(screen.getByText('JS Comercio')).toBeInTheDocument();
    });
    expect(screen.getByText('JS Comercio LTDA')).toBeInTheDocument();
    expect(screen.getByText('12.345.678/0001-00')).toBeInTheDocument();
  });

  it('usa nome quando nome_fantasia é null', async () => {
    clientesAPI.getAll.mockResolvedValue({ data: clientesMock });
    render(<Clientes />);

    await waitFor(() => {
      expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    });
  });

  it('exibe "-" para campos nulos', async () => {
    clientesAPI.getAll.mockResolvedValue({ data: clientesMock });
    render(<Clientes />);

    await waitFor(() => {
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  it('exibe mensagem quando não há clientes', async () => {
    clientesAPI.getAll.mockResolvedValue({ data: [] });
    render(<Clientes />);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum cliente cadastrado/i)).toBeInTheDocument();
    });
  });

  it('abre modal de novo cliente ao clicar no botão', async () => {
    clientesAPI.getAll.mockResolvedValue({ data: clientesMock });
    render(<Clientes />);

    await waitFor(() => screen.getByText('JS Comercio'));
    fireEvent.click(screen.getByText(/\+ Novo Cliente/i));

    expect(screen.getByText('Novo Cliente')).toBeInTheDocument();
  });

  it('fecha modal ao clicar em Cancelar', async () => {
    clientesAPI.getAll.mockResolvedValue({ data: clientesMock });
    render(<Clientes />);

    await waitFor(() => screen.getByText('JS Comercio'));
    fireEvent.click(screen.getByText(/\+ Novo Cliente/i));
    fireEvent.click(screen.getByText('Cancelar'));

    expect(screen.queryByText('Novo Cliente')).not.toBeInTheDocument();
  });

  it('abre modal de edição com dados do cliente', async () => {
    clientesAPI.getAll.mockResolvedValue({ data: clientesMock });
    render(<Clientes />);

    await waitFor(() => screen.getByText('JS Comercio'));
    const editarBtns = screen.getAllByText('Editar');
    fireEvent.click(editarBtns[0]);

    expect(screen.getByText('Editar Cliente')).toBeInTheDocument();
    expect(screen.getByDisplayValue('João Silva')).toBeInTheDocument();
  });

  it('cria novo cliente com sucesso', async () => {
    const user = userEvent.setup();
    clientesAPI.getAll.mockResolvedValue({ data: clientesMock });
    clientesAPI.create.mockResolvedValue({ data: { id: 3, nome: 'Novo Cliente' } });

    render(<Clientes />);
    await waitFor(() => screen.getByText('JS Comercio'));

    fireEvent.click(screen.getByText(/\+ Novo Cliente/i));

    const nomeInput = screen.getByPlaceholderText('Nome do contato');
    await user.type(nomeInput, 'Novo Cliente');

    fireEvent.submit(screen.getByText('Salvar').closest('form'));

    await waitFor(() => {
      expect(clientesAPI.create).toHaveBeenCalledWith(expect.objectContaining({
        nome: 'Novo Cliente'
      }));
    });
  });

  it('atualiza cliente existente com sucesso', async () => {
    clientesAPI.getAll.mockResolvedValue({ data: clientesMock });
    clientesAPI.update.mockResolvedValue({ data: clientesMock[0] });

    render(<Clientes />);
    await waitFor(() => screen.getByText('JS Comercio'));

    const editarBtns = screen.getAllByText('Editar');
    fireEvent.click(editarBtns[0]);

    expect(screen.getByText('Editar Cliente')).toBeInTheDocument();

    const form = screen.getByText('Salvar').closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(clientesAPI.update).toHaveBeenCalledWith(1, expect.any(Object));
    });
  });

  it('deleta cliente com confirmação', async () => {
    clientesAPI.getAll.mockResolvedValue({ data: clientesMock });
    clientesAPI.delete.mockResolvedValue({});

    render(<Clientes />);
    await waitFor(() => screen.getByText('JS Comercio'));

    const deletarBtns = screen.getAllByText('Deletar');
    fireEvent.click(deletarBtns[0]);

    expect(window.confirm).toHaveBeenCalledWith('Tem certeza que deseja deletar este cliente?');
    await waitFor(() => {
      expect(clientesAPI.delete).toHaveBeenCalledWith(1);
    });
  });

  it('não deleta cliente se confirmação for cancelada', async () => {
    window.confirm.mockReturnValue(false);
    clientesAPI.getAll.mockResolvedValue({ data: clientesMock });

    render(<Clientes />);
    await waitFor(() => screen.getByText('JS Comercio'));

    const deletarBtns = screen.getAllByText('Deletar');
    fireEvent.click(deletarBtns[0]);

    expect(clientesAPI.delete).not.toHaveBeenCalled();
  });

  it('lida com erro ao criar cliente', async () => {
    const user = userEvent.setup();
    clientesAPI.getAll.mockResolvedValue({ data: clientesMock });
    clientesAPI.create.mockRejectedValue({
      response: { data: { error: 'CPF/CNPJ já cadastrado' } }
    });

    render(<Clientes />);
    await waitFor(() => screen.getByText('JS Comercio'));

    fireEvent.click(screen.getByText(/\+ Novo Cliente/i));
    const nomeInput = screen.getByPlaceholderText('Nome do contato');
    await user.type(nomeInput, 'Empresa Duplicada');

    const form = screen.getByText('Salvar').closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Erro ao salvar cliente.')).toBeInTheDocument();
    });
  });

  it('lida com erro ao deletar cliente', async () => {
    clientesAPI.getAll.mockResolvedValue({ data: clientesMock });
    clientesAPI.delete.mockRejectedValue(new Error('Network error'));

    render(<Clientes />);
    await waitFor(() => screen.getByText('JS Comercio'));

    const deletarBtns = screen.getAllByText('Deletar');
    fireEvent.click(deletarBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Erro ao deletar cliente.')).toBeInTheDocument();
    });
  });

  it('atualiza campos do formulário corretamente', async () => {
    const user = userEvent.setup();
    clientesAPI.getAll.mockResolvedValue({ data: [] });
    render(<Clientes />);

    await waitFor(() => screen.getByText(/Nenhum cliente cadastrado/i));

    fireEvent.click(screen.getByText(/\+ Novo Cliente/i));

    const emailInput = screen.getByPlaceholderText('email@example.com');
    await user.type(emailInput, 'teste@email.com');
    expect(emailInput.value).toBe('teste@email.com');

    const telefoneInput = screen.getByPlaceholderText('(11) 99999-9999');
    await user.type(telefoneInput, '11999990000');
    expect(telefoneInput.value).toBe('11999990000');

    const nomeFantasiaInput = screen.getByPlaceholderText('Ex: Supermercado XYZ');
    await user.type(nomeFantasiaInput, 'Minha Loja');
    expect(nomeFantasiaInput.value).toBe('Minha Loja');

    const razaoSocialInput = screen.getByPlaceholderText('Ex: Empresa LTDA');
    await user.type(razaoSocialInput, 'Empresa LTDA');
    expect(razaoSocialInput.value).toBe('Empresa LTDA');

    const cnpjInput = screen.getByPlaceholderText('00.000.000/0000-00');
    await user.type(cnpjInput, '12345678000100');
    expect(cnpjInput.value).toBe('12345678000100');

    const ieInput = screen.getByPlaceholderText('IE');
    await user.type(ieInput, 'IE123');
    expect(ieInput.value).toBe('IE123');

    const cepInput = screen.getByPlaceholderText('00000-000');
    await user.type(cepInput, '01310100');
    expect(cepInput.value).toBe('01310100');

    const enderecoInput = screen.getByPlaceholderText('Rua/Avenida, número');
    await user.type(enderecoInput, 'Av. Paulista, 1000');
    expect(enderecoInput.value).toBe('Av. Paulista, 1000');

    const bairroInput = screen.getByPlaceholderText('Nome do bairro');
    await user.type(bairroInput, 'Bela Vista');
    expect(bairroInput.value).toBe('Bela Vista');

    const cidadeInput = screen.getByPlaceholderText('Nome da cidade');
    await user.type(cidadeInput, 'São Paulo');
    expect(cidadeInput.value).toBe('São Paulo');
  });

  it('lida com erro ao carregar clientes (loadClientes catch)', async () => {
    clientesAPI.getAll.mockRejectedValue(new Error('Network error'));
    render(<Clientes />);

    await waitFor(() => {
      expect(screen.queryByText(/Carregando clientes/i)).not.toBeInTheDocument();
    });
    // Sem clientes carregados, mostra empty state
    expect(screen.getByText(/Nenhum cliente cadastrado/i)).toBeInTheDocument();
  });
});
