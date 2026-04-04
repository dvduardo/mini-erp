import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../services/api', () => ({
  pedidosAPI: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  clientesAPI: {
    getAll: vi.fn()
  },
  notasFiscaisAPI: {
    upload: vi.fn(),
    delete: vi.fn()
  },
  produtosAPI: {
    getByPedido: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

import { pedidosAPI, clientesAPI, notasFiscaisAPI, produtosAPI } from '../services/api';
import Pedidos from '../pages/Pedidos';

const clientesMock = [
  {
    id: 1,
    nome: 'Empresa A',
    endereco: 'Rua das Flores, 123',
    bairro: 'Centro',
    cidade: 'Sao Paulo',
    cep: '01000-000'
  },
  { id: 2, nome: 'Empresa B', endereco: '', bairro: '', cidade: '', cep: '' }
];

const pedidosMock = [
  {
    id: 1,
    cliente_id: 1,
    numero_pedido: 'PED-001',
    status: 'pendente',
    total_pedido: 500,
    data_criacao: '2024-01-01T00:00:00.000Z',
    data_entrega: '2024-02-01T00:00:00.000Z',
    cliente_nome: 'Empresa A',
    observacoes: '',
    endereco_entrega: '',
    bairro_entrega: '',
    cidade_entrega: '',
    cep_entrega: ''
  },
  {
    id: 2,
    cliente_id: 2,
    numero_pedido: 'PED-002',
    status: 'entregue',
    total_pedido: 100,
    data_criacao: '2024-01-15T00:00:00.000Z',
    data_entrega: null,
    cliente_nome: 'Empresa B',
    observacoes: ''
  }
];

const pedidoDetalhadoMock = {
  ...pedidosMock[0],
  email: 'a@a.com',
  telefone: '11999',
  cpf_cnpj: '12.345.678/0001-00',
  endereco: 'Rua Teste, 123',
  produtos: [
    { id: 1, cod_fornecedor: 'FORN-1', produto_receber: 'Produto X', quantidade: 5, valor_unitario: 10, valor_item: 50 }
  ],
  boletos: [
    { id: 1, valor: 100, data_vencimento: '2024-12-01', status_pagamento: 'pendente' }
  ],
  notaFiscal: null
};

describe('Pedidos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  const setupMocks = (pedidos = pedidosMock) => {
    pedidosAPI.getAll.mockResolvedValue({ data: pedidos });
    clientesAPI.getAll.mockResolvedValue({ data: clientesMock });
  };

  // ── Renderização e carregamento ──────────────────────────────────────────────
  it('exibe estado de carregamento inicialmente', () => {
    setupMocks();
    render(<Pedidos />);
    expect(screen.getByText(/Carregando pedidos/i)).toBeInTheDocument();
  });

  it('lida com erro ao carregar dados no mount (loadData catch)', async () => {
    pedidosAPI.getAll.mockRejectedValue(new Error('Falha ao carregar pedidos'));
    clientesAPI.getAll.mockResolvedValue({ data: clientesMock });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Pedidos />);

    await waitFor(() => {
      expect(screen.queryByText(/Carregando pedidos/i)).not.toBeInTheDocument();
    });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('exibe lista de pedidos após carregar', async () => {
    setupMocks();
    render(<Pedidos />);

    await waitFor(() => {
      expect(screen.getByText('PED-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Empresa A')).toBeInTheDocument();
    expect(screen.getByText('pendente')).toBeInTheDocument();
  });

  it('exibe "-" para data de entrega nula', async () => {
    setupMocks();
    render(<Pedidos />);

    await waitFor(() => screen.getByText('PED-002'));
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('exibe mensagem quando não há pedidos', async () => {
    setupMocks([]);
    render(<Pedidos />);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum pedido cadastrado/i)).toBeInTheDocument();
    });
  });

  // ── Modal de criação ─────────────────────────────────────────────────────────
  it('abre modal de novo pedido ao clicar no botão', async () => {
    setupMocks();
    render(<Pedidos />);

    await waitFor(() => screen.getByText('PED-001'));
    fireEvent.click(screen.getByText(/\+ Novo Pedido/i));

    expect(screen.getByText('Novo Pedido')).toBeInTheDocument();
  });

  it('exibe seção de produtos ao abrir modal de criação', async () => {
    setupMocks();
    render(<Pedidos />);

    await waitFor(() => screen.getByText('PED-001'));
    fireEvent.click(screen.getByText(/\+ Novo Pedido/i));

    expect(screen.getByText(/Produtos do Pedido/i)).toBeInTheDocument();
  });

  it('fecha modal ao clicar em Cancelar', async () => {
    setupMocks();
    render(<Pedidos />);

    await waitFor(() => screen.getByText('PED-001'));
    fireEvent.click(screen.getByText(/\+ Novo Pedido/i));
    fireEvent.click(screen.getByText('Cancelar'));

    expect(screen.queryByText('Novo Pedido')).not.toBeInTheDocument();
  });

  it('fecha modal de pedido ao clicar no X', async () => {
    setupMocks();
    render(<Pedidos />);

    await waitFor(() => screen.getByText('PED-001'));
    fireEvent.click(screen.getByText(/\+ Novo Pedido/i));
    fireEvent.click(screen.getByLabelText('Fechar janela'));

    expect(screen.queryByText('Novo Pedido')).not.toBeInTheDocument();
  });

  it('adiciona linha de produto ao clicar em "+ Adicionar Produto"', async () => {
    setupMocks();
    render(<Pedidos />);

    await waitFor(() => screen.getByText('PED-001'));
    fireEvent.click(screen.getByText(/\+ Novo Pedido/i));

    const adicionarBtn = screen.getByText('+ Adicionar Produto');
    fireEvent.click(adicionarBtn);

    const produtoLabels = screen.getAllByText(/Produto a Receber/i);
    expect(produtoLabels.length).toBe(2);
  });

  it('remove linha de produto ao clicar em Remover', async () => {
    setupMocks();
    render(<Pedidos />);

    await waitFor(() => screen.getByText('PED-001'));
    fireEvent.click(screen.getByText(/\+ Novo Pedido/i));

    fireEvent.click(screen.getByText('+ Adicionar Produto'));
    const removerBtns = screen.getAllByText('Remover');
    fireEvent.click(removerBtns[0]);

    const produtoLabels = screen.getAllByText(/Produto a Receber/i);
    expect(produtoLabels.length).toBe(1);
  });

  // ── Modal de edição ──────────────────────────────────────────────────────────
  it('abre modal de edição com dados do pedido', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });
    render(<Pedidos />);

    await waitFor(() => screen.getByText('PED-001'));
    const editarBtns = screen.getAllByText('Editar');
    fireEvent.click(editarBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Editar Pedido')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('PED-001')).toBeInTheDocument();
  });

  it('carrega os produtos do pedido na edição', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });
    render(<Pedidos />);

    await waitFor(() => screen.getByText('PED-001'));
    const editarBtns = screen.getAllByText('Editar');
    fireEvent.click(editarBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Produtos do Pedido/i)).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Produto X')).toBeInTheDocument();
    expect(screen.getByDisplayValue('FORN-1')).toBeInTheDocument();
  });

  // ── Criação de pedido ────────────────────────────────────────────────────────
  it('cria pedido sem produtos válidos (campos vazios)', async () => {
    setupMocks();
    pedidosAPI.create.mockResolvedValue({ data: { id: 3, ...pedidosMock[0] } });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getByText(/\+ Novo Pedido/i));

    const numeroPedidoInput = screen.getAllByRole('textbox').find(el => el.value === '');
    fireEvent.change(numeroPedidoInput, { target: { value: 'PED-003' } });

    const form = screen.getByText('Salvar').closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(pedidosAPI.create).toHaveBeenCalledWith(expect.objectContaining({
        numero_pedido: 'PED-003'
      }));
    });
  });

  it('cria pedido com produto válido e envia campos numéricos opcionais', async () => {
    setupMocks();
    pedidosAPI.create.mockResolvedValue({ data: { id: 300 } });
    produtosAPI.create.mockResolvedValue({ data: { id: 900 } });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getByText(/\+ Novo Pedido/i));

    const clienteSelect = screen.getByText('Cliente *').closest('.form-group').querySelector('select');
    fireEvent.change(clienteSelect, { target: { value: '1' } });

    const numeroPedidoInput = screen.getByText('Número do Pedido *').closest('.form-group').querySelector('input');
    fireEvent.change(numeroPedidoInput, { target: { value: 'PED-COM-PRODUTO' } });

    const dataEmissaoInput = screen.getByText('Data de Emissão').closest('.form-group').querySelector('input');
    fireEvent.change(dataEmissaoInput, { target: { value: '2026-04-01' } });

    const dataEntregaInput = screen.getByText('Data de Entrega').closest('.form-group').querySelector('input');
    fireEvent.change(dataEntregaInput, { target: { value: '2026-04-15' } });

    const produtoInput = screen.getByText('Produto a Receber *').closest('.form-group').querySelector('input');
    fireEvent.change(produtoInput, { target: { value: 'Produto Loop' } });

    const quantidadeInput = screen.getByText('Quantidade *').closest('.form-group').querySelector('input');
    fireEvent.change(quantidadeInput, { target: { value: '10' } });

    const valorUnitarioInput = screen.getByText('Valor Unitário (R$) *').closest('.form-group').querySelector('input');
    fireEvent.change(valorUnitarioInput, { target: { value: '12.50' } });

    const valorItemInput = screen.getByText('Valor Item (R$) *').closest('.form-group').querySelector('input');
    fireEvent.change(valorItemInput, { target: { value: '125.00' } });

    const custoBrutoInput = screen.getByText('Custo Bruto (R$)').closest('.form-group').querySelector('input');
    fireEvent.change(custoBrutoInput, { target: { value: '100.00' } });

    const icmsStInput = screen.getByText('Valor ICMS ST (R$)').closest('.form-group').querySelector('input');
    fireEvent.change(icmsStInput, { target: { value: '8.50' } });

    const form = screen.getByText('Salvar').closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(produtosAPI.create).toHaveBeenCalledWith(expect.objectContaining({
        pedido_id: 300,
        produto_receber: 'Produto Loop',
        quantidade: 10,
        valor_unitario: 12.5,
        valor_item: 125,
        custo_bruto: 100,
        valor_icms_st: 8.5
      }));
    });
  });

  // ── Atualização de pedido ────────────────────────────────────────────────────
  it('atualiza pedido com sucesso', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });
    pedidosAPI.update.mockResolvedValue({ data: pedidosMock[0] });
    produtosAPI.update.mockResolvedValue({ data: pedidoDetalhadoMock.produtos[0] });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    const editarBtns = screen.getAllByText('Editar');
    fireEvent.click(editarBtns[0]);

    await waitFor(() => screen.getByText('Salvar'));
    const form = screen.getByText('Salvar').closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(pedidosAPI.update).toHaveBeenCalledWith(1, expect.any(Object));
    });
    expect(produtosAPI.update).toHaveBeenCalledWith(1, expect.objectContaining({
      cod_fornecedor: 'FORN-1',
      produto_receber: 'Produto X'
    }));
  });

  it('permite adicionar um novo produto na edição do pedido', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });
    pedidosAPI.update.mockResolvedValue({ data: pedidosMock[0] });
    produtosAPI.update.mockResolvedValue({ data: pedidoDetalhadoMock.produtos[0] });
    produtosAPI.create.mockResolvedValue({ data: { id: 2 } });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Editar')[0]);
    await waitFor(() => screen.getByDisplayValue('Produto X'));

    fireEvent.click(screen.getByText('+ Adicionar Produto'));

    const produtoLabels = screen.getAllByText(/Produto a Receber \*/i);
    const novoProdutoInput = produtoLabels[1].closest('.form-group').querySelector('input');
    fireEvent.change(novoProdutoInput, { target: { value: 'Produto Novo' } });

    const quantidadeInputs = screen.getAllByText('Quantidade *').map((label) => label.closest('.form-group').querySelector('input'));
    fireEvent.change(quantidadeInputs[1], { target: { value: '3' } });

    const valorUnitarioInputs = screen.getAllByText('Valor Unitário (R$) *').map((label) => label.closest('.form-group').querySelector('input'));
    fireEvent.change(valorUnitarioInputs[1], { target: { value: '15.50' } });

    const valorItemInputs = screen.getAllByText('Valor Item (R$) *').map((label) => label.closest('.form-group').querySelector('input'));
    fireEvent.change(valorItemInputs[1], { target: { value: '46.50' } });

    fireEvent.submit(screen.getByText('Salvar').closest('form'));

    await waitFor(() => {
      expect(produtosAPI.create).toHaveBeenCalledWith(expect.objectContaining({
        pedido_id: 1,
        produto_receber: 'Produto Novo',
        quantidade: 3,
        valor_unitario: 15.5,
        valor_item: 46.5
      }));
    });
  });

  it('remove produto excluído no modal de edição ao salvar', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });
    pedidosAPI.update.mockResolvedValue({ data: pedidosMock[0] });
    produtosAPI.delete.mockResolvedValue({});

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Editar')[0]);
    await waitFor(() => screen.getByDisplayValue('Produto X'));

    fireEvent.click(screen.getByText('+ Adicionar Produto'));
    fireEvent.click(screen.getAllByText('Remover')[0]);
    await waitFor(() => screen.getByText('Salvar'));
    fireEvent.submit(screen.getByText('Salvar').closest('form'));

    await waitFor(() => {
      expect(produtosAPI.delete).toHaveBeenCalledWith(1);
    });
  });

  // ── Deleção ──────────────────────────────────────────────────────────────────
  it('deleta pedido com confirmação', async () => {
    setupMocks();
    pedidosAPI.delete.mockResolvedValue({});

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    const deletarBtns = screen.getAllByText('Deletar');
    fireEvent.click(deletarBtns[0]);

    expect(window.confirm).toHaveBeenCalledWith('Tem certeza que deseja deletar este pedido?');
    await waitFor(() => {
      expect(pedidosAPI.delete).toHaveBeenCalledWith(1);
    });
  });

  it('não deleta pedido se confirmação cancelada', async () => {
    window.confirm.mockReturnValue(false);
    setupMocks();

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    const deletarBtns = screen.getAllByText('Deletar');
    fireEvent.click(deletarBtns[0]);

    expect(pedidosAPI.delete).not.toHaveBeenCalled();
  });

  // ── Modal de detalhes ────────────────────────────────────────────────────────
  it('abre modal de detalhes ao clicar em Detalhes', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    const detalhesBtns = screen.getAllByText('Detalhes');
    fireEvent.click(detalhesBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Produto X/i)).toBeInTheDocument();
    });
  });

  it('exibe boletos no modal de detalhes', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);

    await waitFor(() => {
      expect(screen.getByText('pendente')).toBeInTheDocument();
    });
  });

  it('exibe fallbacks no modal de detalhes quando campos/listas estão vazios', async () => {
    const pedidoFallback = {
      ...pedidoDetalhadoMock,
      email: '',
      telefone: '',
      endereco: '',
      data_emissao: null,
      data_entrega: null,
      total_pedido: null,
      endereco_entrega: '',
      bairro_entrega: '',
      cidade_entrega: '',
      cep_entrega: '',
      observacoes: '',
      produtos: [],
      boletos: [],
      notaFiscal: {
        id: 99,
        numero_nota_fiscal: null,
        caminho_arquivo: 'uploads/nota-fallback.pdf'
      }
    };

    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoFallback });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);

    await waitFor(() => {
      expect(screen.getByText('Nenhum produto cadastrado')).toBeInTheDocument();
      expect(screen.getByText('Nenhum boleto cadastrado')).toBeInTheDocument();
    });

    // Fallbacks de campos vazios devem aparecer como '-'
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(3);

    // Sem observacoes, o bloco de observacoes nao deve aparecer
    expect(screen.queryByText('Observações:')).not.toBeInTheDocument();
  });

  it('deleta produto no modal de detalhes', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });
    produtosAPI.delete.mockResolvedValue({});

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);
    await waitFor(() => screen.getByText('Produto X'));

    // O botão Deletar do produto está dentro da tabela de produtos do modal
    const deletarProdutoBtns = screen.getAllByText('Deletar');
    // Clica no último Deletar (produto está no modal de detalhes, os primeiros são dos pedidos na lista)
    fireEvent.click(deletarProdutoBtns[deletarProdutoBtns.length - 1]);

    await waitFor(() => {
      expect(produtosAPI.delete).toHaveBeenCalledWith(1);
    });
  });

  it('alerta quando tentar fazer upload sem selecionar arquivo', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);
    await waitFor(() => screen.getByText(/Anexar Nota Fiscal/i));

    fireEvent.click(screen.getByText(/Anexar Nota Fiscal/i));

    expect(screen.getByText('Selecione um arquivo em PDF para enviar.')).toBeInTheDocument();
  });

  it('deleta nota fiscal quando existe', async () => {
    const pedidoComNota = {
      ...pedidoDetalhadoMock,
      notaFiscal: { id: 1, numero_nota_fiscal: 'NF-001', caminho_arquivo: 'uploads/abc.pdf' }
    };
    setupMocks();
    pedidosAPI.getById
      .mockResolvedValueOnce({ data: pedidoComNota })
      .mockResolvedValueOnce({ data: { ...pedidoComNota, notaFiscal: null } });
    notasFiscaisAPI.delete.mockResolvedValue({});

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);
    await waitFor(() => screen.getByText('NF-001'));

    const removerNFBtn = screen.getAllByText('Remover')[0];
    fireEvent.click(removerNFBtn);

    await waitFor(() => {
      expect(notasFiscaisAPI.delete).toHaveBeenCalledWith(1);
    });
  });

  // ── Tratamento de erros ──────────────────────────────────────────────────────
  it('lida com erro ao salvar pedido', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });
    pedidosAPI.update.mockRejectedValue({
      response: { data: { error: 'Erro ao salvar' } }
    });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    const editarBtns = screen.getAllByText('Editar');
    fireEvent.click(editarBtns[0]);

    await waitFor(() => screen.getByText('Salvar'));
    const form = screen.getByText('Salvar').closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Erro ao salvar')).toBeInTheDocument();
    });
  });

  it('lida com erro ao deletar pedido', async () => {
    setupMocks();
    pedidosAPI.delete.mockRejectedValue(new Error('Network error'));

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    const deletarBtns = screen.getAllByText('Deletar');
    fireEvent.click(deletarBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Você parece estar sem conexão para remover o pedido.')).toBeInTheDocument();
    });
  });

  it('lida com erro ao carregar detalhes do pedido', async () => {
    setupMocks();
    pedidosAPI.getById.mockRejectedValue(new Error('Network error'));

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);

    // Não deve abrir o modal de detalhes
    await waitFor(() => {
      expect(screen.queryByText('Produto X')).not.toBeInTheDocument();
    });
  });

  it('abre modal de adicionar produto nos detalhes', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);
    await waitFor(() => screen.getByText('Produto X'));

    const addProdutoBtn = screen.getByText('+ Adicionar Produto');
    fireEvent.click(addProdutoBtn);

    expect(screen.getByText(/Adicionar Produto ao Pedido/i)).toBeInTheDocument();
  });

  it('fecha modal de adicionar produto ao clicar em Cancelar', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);
    await waitFor(() => screen.getByText('Produto X'));

    fireEvent.click(screen.getByText('+ Adicionar Produto'));

    const cancelarBtns = screen.getAllByText('Cancelar');
    fireEvent.click(cancelarBtns[cancelarBtns.length - 1]);

    expect(screen.queryByText(/Adicionar Produto ao Pedido/i)).not.toBeInTheDocument();
  });

  it('cria produto no modal de detalhes', async () => {
    setupMocks();
    pedidosAPI.getById
      .mockResolvedValueOnce({ data: pedidoDetalhadoMock })
      .mockResolvedValueOnce({ data: pedidoDetalhadoMock });
    produtosAPI.create.mockResolvedValue({ data: { id: 2, produto_receber: 'Produto Y' } });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);
    await waitFor(() => screen.getByText('Produto X'));

    fireEvent.click(screen.getByText('+ Adicionar Produto'));

    const form = screen.getByText('Adicionar').closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(produtosAPI.create).toHaveBeenCalledWith(expect.objectContaining({
        pedido_id: 1
      }));
    });
  });

  // ── Campos do formulário de produto (novo pedido) ────────────────────────────
  it('preenche todos os campos de produto no formulário de novo pedido', async () => {
    setupMocks();
    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getByText(/\+ Novo Pedido/i));

    // Pegar todos os inputs do formulário de produto
    const inputs = screen.getAllByRole('textbox');
    // produto_receber é o primeiro input de texto na seção de produtos
    const produtoInputs = inputs.filter(i => i.value === '');
    produtoInputs.forEach(input => {
      fireEvent.change(input, { target: { value: 'teste' } });
    });

    const spinbuttons = screen.getAllByRole('spinbutton');
    spinbuttons.forEach(input => {
      fireEvent.change(input, { target: { value: '10' } });
    });

    // Fechar modal
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Novo Pedido')).not.toBeInTheDocument();
  });

  it('preenche campos do formulário de adicionar produto nos detalhes', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);
    await waitFor(() => screen.getByText('Produto X'));

    fireEvent.click(screen.getByText('+ Adicionar Produto'));
    await waitFor(() => screen.getByText(/Adicionar Produto ao Pedido/i));

    // Preencher todos os campos do modal de adicionar produto
    const textboxes = screen.getAllByRole('textbox');
    textboxes.forEach(input => {
      if (input.value === '') fireEvent.change(input, { target: { value: 'campo_teste' } });
    });
    const spinbuttons = screen.getAllByRole('spinbutton');
    spinbuttons.forEach(input => {
      fireEvent.change(input, { target: { value: '5' } });
    });

    // Cancelar
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText(/Adicionar Produto ao Pedido/i)).not.toBeInTheDocument();
  });

  it('preenche campos do formulário principal de novo pedido', async () => {
    setupMocks();
    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getByText(/\+ Novo Pedido/i));

    // Selecionar cliente
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '1' } });

    // Status
    fireEvent.change(selects[selects.length - 1], { target: { value: 'em_preparacao' } });

    // There might be multiple textboxes, just change a few
    const allTextboxes = screen.getAllByRole('textbox');
    allTextboxes.slice(0, 3).forEach(input => {
      fireEvent.change(input, { target: { value: 'valor_teste' } });
    });

    fireEvent.click(screen.getByText('Cancelar'));
  });

  it('autopreenche endereço de entrega ao selecionar cliente com endereço cadastrado', async () => {
    setupMocks();
    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getByText(/\+ Novo Pedido/i));

    const clienteSelect = screen.getByText('Cliente *').closest('.form-group').querySelector('select');
    fireEvent.change(clienteSelect, { target: { value: '1' } });

    expect(screen.getByDisplayValue('Rua das Flores, 123')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Centro')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sao Paulo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('01000-000')).toBeInTheDocument();
    expect(screen.getByText(/Os dados de entrega foram carregados do cadastro do cliente/i)).toBeInTheDocument();
  });

  it('mantém campos de entrega em branco ao selecionar cliente sem endereço cadastrado', async () => {
    setupMocks();
    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getByText(/\+ Novo Pedido/i));

    const clienteSelect = screen.getByText('Cliente *').closest('.form-group').querySelector('select');
    fireEvent.change(clienteSelect, { target: { value: '2' } });

    expect(screen.getByText('Endereço de Entrega').closest('.form-group').querySelector('input')).toHaveValue('');
    expect(screen.getByText('Bairro').closest('.form-group').querySelector('input')).toHaveValue('');
    expect(screen.getByText('Cidade').closest('.form-group').querySelector('input')).toHaveValue('');
    expect(screen.getByText('CEP').closest('.form-group').querySelector('input')).toHaveValue('');
    expect(screen.getByText(/Este cliente não possui endereço cadastrado/i)).toBeInTheDocument();
  });

  it('lida com erro ao adicionar produto no modal de detalhes', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });
    produtosAPI.create.mockRejectedValue({ response: { data: { error: 'Erro' } } });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);
    await waitFor(() => screen.getByText('Produto X'));

    fireEvent.click(screen.getByText('+ Adicionar Produto'));

    const form = screen.getByText('Adicionar').closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Erro')).toBeInTheDocument();
    });
  });

  it('lida com erro ao deletar produto', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });
    produtosAPI.delete.mockRejectedValue(new Error('Erro'));

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);
    await waitFor(() => screen.getByText('Produto X'));

    const deletarBtns = screen.getAllByText('Deletar');
    fireEvent.click(deletarBtns[deletarBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('Você parece estar sem conexão para remover o produto.')).toBeInTheDocument();
    });
  });

  it('lida com erro ao deletar nota fiscal', async () => {
    const pedidoComNota = {
      ...pedidoDetalhadoMock,
      notaFiscal: { id: 1, numero_nota_fiscal: 'NF-001', caminho_arquivo: 'uploads/abc.pdf' }
    };
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoComNota });
    notasFiscaisAPI.delete.mockRejectedValue(new Error('Erro'));

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);
    await waitFor(() => screen.getByText('NF-001'));

    const removerBtn = screen.getAllByText('Remover')[0];
    fireEvent.click(removerBtn);

    await waitFor(() => {
      expect(screen.getByText('Você parece estar sem conexão para remover a nota fiscal.')).toBeInTheDocument();
    });
  });

  it('faz upload de nota fiscal com sucesso', async () => {
    setupMocks();
    pedidosAPI.getById
      .mockResolvedValueOnce({ data: pedidoDetalhadoMock })
      .mockResolvedValueOnce({ data: pedidoDetalhadoMock });
    notasFiscaisAPI.upload.mockResolvedValue({ data: {} });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);
    await waitFor(() => screen.getByText(/Anexar Nota Fiscal/i));

    // Definir número da nota fiscal
    const notaInput = screen.getByPlaceholderText(/Número da nota fiscal/i);
    fireEvent.change(notaInput, { target: { value: 'NF-999' } });

    // Simular seleção de arquivo
    const fileInput = screen.getByRole('textbox', { hidden: true }) || document.querySelector('input[type="file"]');
    const file = new File(['pdf content'], 'nota.pdf', { type: 'application/pdf' });
    const fileInputEl = document.querySelector('input[type="file"]');
    if (fileInputEl) {
      Object.defineProperty(fileInputEl, 'files', { value: [file], configurable: true });
      fireEvent.change(fileInputEl, { target: { files: [file] } });
    }

    fireEvent.click(screen.getByText(/Anexar Nota Fiscal/i));

    // Com arquivo selecionado, o upload deve ser chamado
    await waitFor(() => {
      expect(notasFiscaisAPI.upload).toHaveBeenCalled();
    });
  });

  it('lida com erro no upload de nota fiscal', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });
    notasFiscaisAPI.upload.mockRejectedValue({ response: { data: { error: 'Erro' } } });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);
    await waitFor(() => screen.getByText(/Anexar Nota Fiscal/i));

    // Simular arquivo selecionado
    const file = new File(['pdf'], 'nota.pdf', { type: 'application/pdf' });
    const fileInputEl = document.querySelector('input[type="file"]');
    if (fileInputEl) {
      Object.defineProperty(fileInputEl, 'files', { value: [file], configurable: true });
      fireEvent.change(fileInputEl, { target: { files: [file] } });
    }

    fireEvent.click(screen.getByText(/Anexar Nota Fiscal/i));

    await waitFor(() => {
      expect(screen.getByText('Erro')).toBeInTheDocument();
    });
  });

  it('fecha modal de detalhes ao clicar em Fechar', async () => {
    setupMocks();
    pedidosAPI.getById.mockResolvedValue({ data: pedidoDetalhadoMock });

    render(<Pedidos />);
    await waitFor(() => screen.getByText('PED-001'));

    fireEvent.click(screen.getAllByText('Detalhes')[0]);
    await waitFor(() => screen.getByText('Produto X'));

    fireEvent.click(screen.getByText('Fechar'));
    expect(screen.queryByText('Produto X')).not.toBeInTheDocument();
  });
});
