import React, { useState, useEffect } from 'react';
import { pedidosAPI, clientesAPI, notasFiscaisAPI, produtosAPI } from '../services/api';
import Toast from '../components/Toast';
import { formatBRL } from '../utils/format';

function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddProdutoModal, setShowAddProdutoModal] = useState(false);
  const [formData, setFormData] = useState({
    cliente_id: '',
    numero_pedido: '',
    data_emissao: '',
    data_entrega: '',
    status: 'pendente',
    observacoes: '',
    endereco_entrega: '',
    bairro_entrega: '',
    cidade_entrega: '',
    cep_entrega: '',
    total_pedido: ''
  });
  const [produtosForm, setProdutosForm] = useState([{
    codigo_fornecedor: '',
    cod_seq: '',
    produto_receber: '',
    embalagem: '',
    quantidade: '',
    valor_unitario: '',
    valor_item: '',
    custo_bruto: '',
    valor_icms_st: ''
  }]);
  const [produtoFormData, setProdutoFormData] = useState({
    codigo_fornecedor: '',
    cod_seq: '',
    produto_receber: '',
    embalagem: '',
    quantidade: '',
    valor_unitario: '',
    valor_item: '',
    custo_bruto: '',
    valor_icms_st: ''
  });
  const [notaFiscalFile, setNotaFiscalFile] = useState(null);
  const [notaFiscalNumero, setNotaFiscalNumero] = useState('');
  const [uploadingNota, setUploadingNota] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pedidosRes, clientesRes] = await Promise.all([
        pedidosAPI.getAll(),
        clientesAPI.getAll()
      ]);
      setPedidos(pedidosRes.data);
      setClientes(clientesRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const emptyProduto = () => ({
    codigo_fornecedor: '',
    cod_seq: '',
    produto_receber: '',
    embalagem: '',
    quantidade: '',
    valor_unitario: '',
    valor_item: '',
    custo_bruto: '',
    valor_icms_st: ''
  });

  const handleOpenModal = (pedido = null) => {
    if (pedido) {
      setEditingId(pedido.id);
      setFormData({
        cliente_id: pedido.cliente_id,
        numero_pedido: pedido.numero_pedido,
        data_emissao: pedido.data_emissao ? pedido.data_emissao.split('T')[0] : '',
        data_entrega: pedido.data_entrega ? pedido.data_entrega.split('T')[0] : '',
        status: pedido.status,
        observacoes: pedido.observacoes || '',
        endereco_entrega: pedido.endereco_entrega || '',
        bairro_entrega: pedido.bairro_entrega || '',
        cidade_entrega: pedido.cidade_entrega || '',
        cep_entrega: pedido.cep_entrega || '',
        total_pedido: pedido.total_pedido || ''
      });
      setProdutosForm([]);
    } else {
      setEditingId(null);
      setFormData({
        cliente_id: '',
        numero_pedido: '',
        data_emissao: '',
        data_entrega: '',
        status: 'pendente',
        observacoes: '',
        endereco_entrega: '',
        bairro_entrega: '',
        cidade_entrega: '',
        cep_entrega: '',
        total_pedido: ''
      });
      setProdutosForm([emptyProduto()]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        await pedidosAPI.update(editingId, formData);
      } else {
        const res = await pedidosAPI.create(formData);
        const pedidoId = res.data.id;

        const produtosValidos = produtosForm.filter(p => p.produto_receber && p.quantidade && p.valor_unitario && p.valor_item);
        for (const produto of produtosValidos) {
          await produtosAPI.create({
            pedido_id: pedidoId,
            ...produto,
            quantidade: parseFloat(produto.quantidade),
            valor_unitario: parseFloat(produto.valor_unitario),
            valor_item: parseFloat(produto.valor_item),
            custo_bruto: produto.custo_bruto ? parseFloat(produto.custo_bruto) : null,
            valor_icms_st: produto.valor_icms_st ? parseFloat(produto.valor_icms_st) : null
          });
        }
      }

      loadData();
      handleCloseModal();
      setToast({ message: editingId ? 'Pedido atualizado com sucesso!' : 'Pedido criado com sucesso!', type: 'success' });
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      setToast({ message: 'Erro ao salvar pedido.', type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este pedido?')) {
      try {
        await pedidosAPI.delete(id);
        loadData();
        setToast({ message: 'Pedido removido.', type: 'info' });
      } catch (error) {
        console.error('Erro ao deletar pedido:', error);
        setToast({ message: 'Erro ao deletar pedido.', type: 'error' });
      }
    }
  };

  const handleViewDetails = async (pedido) => {
    try {
      const res = await pedidosAPI.getById(pedido.id);
      setSelectedPedido(res.data);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    }
  };

  const handleAddProdutoClick = () => {
    setProdutoFormData({
      codigo_fornecedor: '',
      cod_seq: '',
      produto_receber: '',
      embalagem: '',
      quantidade: '',
      valor_unitario: '',
      valor_item: '',
      custo_bruto: '',
      valor_icms_st: ''
    });
    setShowAddProdutoModal(true);
  };

  const handleCloseProdutoModal = () => {
    setShowAddProdutoModal(false);
  };

  const handleAddProduto = async (e) => {
    e.preventDefault();
    try {
      await produtosAPI.create({
        pedido_id: selectedPedido.id,
        ...produtoFormData,
        quantidade: parseFloat(produtoFormData.quantidade),
        valor_unitario: parseFloat(produtoFormData.valor_unitario),
        valor_item: parseFloat(produtoFormData.valor_item),
        custo_bruto: produtoFormData.custo_bruto ? parseFloat(produtoFormData.custo_bruto) : null,
        valor_icms_st: produtoFormData.valor_icms_st ? parseFloat(produtoFormData.valor_icms_st) : null
      });

      const res = await pedidosAPI.getById(selectedPedido.id);
      setSelectedPedido(res.data);
      handleCloseProdutoModal();
      setToast({ message: 'Produto adicionado com sucesso!', type: 'success' });
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      setToast({ message: 'Erro ao adicionar produto.', type: 'error' });
    }
  };

  const handleDeleteProduto = async (produtoId) => {
    if (window.confirm('Tem certeza que deseja deletar este produto?')) {
      try {
        await produtosAPI.delete(produtoId);
        const res = await pedidosAPI.getById(selectedPedido.id);
        setSelectedPedido(res.data);
        setToast({ message: 'Produto removido.', type: 'info' });
      } catch (error) {
        console.error('Erro ao deletar produto:', error);
        setToast({ message: 'Erro ao deletar produto.', type: 'error' });
      }
    }
  };

  const handleUploadNotaFiscal = async () => {
    if (!notaFiscalFile) {
      alert('Selecione um arquivo PDF');
      return;
    }
    try {
      setUploadingNota(true);
      const formData = new FormData();
      formData.append('arquivo', notaFiscalFile);
      formData.append('pedido_id', selectedPedido.id);
      if (notaFiscalNumero) formData.append('numero_nota_fiscal', notaFiscalNumero);
      await notasFiscaisAPI.upload(formData);
      const res = await pedidosAPI.getById(selectedPedido.id);
      setSelectedPedido(res.data);
      setNotaFiscalFile(null);
      setNotaFiscalNumero('');
    } catch (error) {
      console.error('Erro ao enviar nota fiscal:', error);
      alert('Erro ao enviar nota fiscal: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploadingNota(false);
    }
  };

  const handleDeleteNotaFiscal = async () => {
    if (window.confirm('Tem certeza que deseja remover a nota fiscal?')) {
      try {
        await notasFiscaisAPI.delete(selectedPedido.notaFiscal.id);
        const res = await pedidosAPI.getById(selectedPedido.id);
        setSelectedPedido(res.data);
      } catch (error) {
        console.error('Erro ao deletar nota fiscal:', error);
        alert('Erro ao deletar nota fiscal');
      }
    }
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <h2>Pedidos</h2>
        <button onClick={() => handleOpenModal()}>+ Novo Pedido</button>
      </div>

      {loading ? (
        <p className="loading">Carregando pedidos...</p>
      ) : pedidos.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum pedido cadastrado ainda.</p>
          <button onClick={() => handleOpenModal()}>+ Criar primeiro pedido</button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Data Criação</th>
                <th>Data Entrega</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <tr key={pedido.id}>
                  <td>{pedido.numero_pedido}</td>
                  <td>{pedido.cliente_nome}</td>
                  <td>{new Date(pedido.data_criacao).toLocaleDateString('pt-BR')}</td>
                  <td>{pedido.data_entrega ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR') : '-'}</td>
                  <td>{pedido.status}</td>
                  <td>
                    <div className="btn-group">
                      <button onClick={() => handleViewDetails(pedido)}>Detalhes</button>
                      <button onClick={() => handleOpenModal(pedido)}>Editar</button>
                      <button className="danger" onClick={() => handleDelete(pedido.id)}>Deletar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal active">
          <div className="modal-content">
            <h3>{editingId ? 'Editar Pedido' : 'Novo Pedido'}</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Cliente *</label>
                  <select
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                    required
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Número do Pedido *</label>
                  <input
                    type="text"
                    value={formData.numero_pedido}
                    onChange={(e) => setFormData({ ...formData, numero_pedido: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data de Emissão</label>
                  <input
                    type="date"
                    value={formData.data_emissao}
                    onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Data de Entrega</label>
                  <input
                    type="date"
                    value={formData.data_entrega}
                    onChange={(e) => setFormData({ ...formData, data_entrega: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Total do Pedido (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.total_pedido}
                    onChange={(e) => setFormData({ ...formData, total_pedido: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Endereço de Entrega</label>
                  <input
                    type="text"
                    value={formData.endereco_entrega}
                    onChange={(e) => setFormData({ ...formData, endereco_entrega: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Bairro</label>
                  <input
                    type="text"
                    value={formData.bairro_entrega}
                    onChange={(e) => setFormData({ ...formData, bairro_entrega: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cidade</label>
                  <input
                    type="text"
                    value={formData.cidade_entrega}
                    onChange={(e) => setFormData({ ...formData, cidade_entrega: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>CEP</label>
                  <input
                    type="text"
                    value={formData.cep_entrega}
                    onChange={(e) => setFormData({ ...formData, cep_entrega: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row full">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_preparacao">Em Preparação</option>
                    <option value="entregue">Entregue</option>
                  </select>
                </div>
              </div>

              <div className="form-row full">
                <div className="form-group">
                  <label>Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows="3"
                  />
                </div>
              </div>

              {!editingId && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0 }}>Produtos do Pedido *</h4>
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => setProdutosForm([...produtosForm, emptyProduto()])}
                    >
                      + Adicionar Produto
                    </button>
                  </div>

                  {produtosForm.map((produto, index) => (
                    <div key={index} style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '12px', marginBottom: '10px', position: 'relative' }}>
                      <strong style={{ fontSize: '13px' }}>Produto {index + 1}</strong>
                      {produtosForm.length > 1 && (
                        <button
                          type="button"
                          className="danger btn-sm"
                          onClick={() => setProdutosForm(produtosForm.filter((_, i) => i !== index))}
                          style={{ position: 'absolute', right: '10px', top: '10px' }}
                        >
                          Remover
                        </button>
                      )}

                      <div className="form-row" style={{ marginTop: '8px' }}>
                        <div className="form-group">
                          <label>Produto a Receber *</label>
                          <input
                            type="text"
                            value={produto.produto_receber}
                            onChange={(e) => {
                              const updated = [...produtosForm];
                              updated[index] = { ...updated[index], produto_receber: e.target.value };
                              setProdutosForm(updated);
                            }}
                            required={index === 0}
                          />
                        </div>

                        <div className="form-group">
                          <label>Embalagem</label>
                          <input
                            type="text"
                            value={produto.embalagem}
                            onChange={(e) => {
                              const updated = [...produtosForm];
                              updated[index] = { ...updated[index], embalagem: e.target.value };
                              setProdutosForm(updated);
                            }}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Cód. Fornecedor</label>
                          <input
                            type="text"
                            value={produto.codigo_fornecedor}
                            onChange={(e) => {
                              const updated = [...produtosForm];
                              updated[index] = { ...updated[index], codigo_fornecedor: e.target.value };
                              setProdutosForm(updated);
                            }}
                          />
                        </div>

                        <div className="form-group">
                          <label>Cód. Seq</label>
                          <input
                            type="text"
                            value={produto.cod_seq}
                            onChange={(e) => {
                              const updated = [...produtosForm];
                              updated[index] = { ...updated[index], cod_seq: e.target.value };
                              setProdutosForm(updated);
                            }}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Quantidade *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={produto.quantidade}
                            onChange={(e) => {
                              const updated = [...produtosForm];
                              updated[index] = { ...updated[index], quantidade: e.target.value };
                              setProdutosForm(updated);
                            }}
                            required={index === 0}
                          />
                        </div>

                        <div className="form-group">
                          <label>Valor Unitário (R$) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={produto.valor_unitario}
                            onChange={(e) => {
                              const updated = [...produtosForm];
                              updated[index] = { ...updated[index], valor_unitario: e.target.value };
                              setProdutosForm(updated);
                            }}
                            required={index === 0}
                          />
                        </div>

                        <div className="form-group">
                          <label>Valor Item (R$) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={produto.valor_item}
                            onChange={(e) => {
                              const updated = [...produtosForm];
                              updated[index] = { ...updated[index], valor_item: e.target.value };
                              setProdutosForm(updated);
                            }}
                            required={index === 0}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Custo Bruto (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={produto.custo_bruto}
                            onChange={(e) => {
                              const updated = [...produtosForm];
                              updated[index] = { ...updated[index], custo_bruto: e.target.value };
                              setProdutosForm(updated);
                            }}
                          />
                        </div>

                        <div className="form-group">
                          <label>Valor ICMS ST (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={produto.valor_icms_st}
                            onChange={(e) => {
                              const updated = [...produtosForm];
                              updated[index] = { ...updated[index], valor_icms_st: e.target.value };
                              setProdutosForm(updated);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-buttons">
                <button type="button" className="secondary" onClick={handleCloseModal}>Cancelar</button>
                <button type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && selectedPedido && (
        <div className="modal active">
          <div className="modal-content">
            <h3>Detalhes do Pedido {selectedPedido.numero_pedido}</h3>
            
            <div>
              <h4>Informações do Cliente:</h4>
              <p><strong>Nome:</strong> {selectedPedido.cliente_nome}</p>
              <p><strong>Email:</strong> {selectedPedido.email || '-'}</p>
              <p><strong>Telefone:</strong> {selectedPedido.telefone || '-'}</p>
              <p><strong>Endereço:</strong> {selectedPedido.endereco || '-'}</p>

              <h4>Informações do Pedido:</h4>
              <p><strong>Número:</strong> {selectedPedido.numero_pedido}</p>
              <p><strong>Data de Emissão:</strong> {selectedPedido.data_emissao ? new Date(selectedPedido.data_emissao).toLocaleDateString('pt-BR') : '-'}</p>
              <p><strong>Data de Entrega:</strong> {selectedPedido.data_entrega ? new Date(selectedPedido.data_entrega).toLocaleDateString('pt-BR') : '-'}</p>
              <p><strong>Total:</strong> R$ {formatBRL(selectedPedido.total_pedido)}</p>
              <p><strong>Status:</strong> {selectedPedido.status}</p>

              <h4>Endereço de Entrega:</h4>
              <p><strong>Endereço:</strong> {selectedPedido.endereco_entrega || '-'}</p>
              <p><strong>Bairro:</strong> {selectedPedido.bairro_entrega || '-'}</p>
              <p><strong>Cidade:</strong> {selectedPedido.cidade_entrega || '-'}</p>
              <p><strong>CEP:</strong> {selectedPedido.cep_entrega || '-'}</p>

              {selectedPedido.observacoes && (
                <>
                  <h4>Observações:</h4>
                  <p>{selectedPedido.observacoes}</p>
                </>
              )}

              <h4>Produtos do Pedido:
                <button className="btn-sm" style={{ marginLeft: '10px' }} onClick={handleAddProdutoClick}>+ Adicionar Produto</button>
              </h4>
              {selectedPedido.produtos && selectedPedido.produtos.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Cód. Fornecedor</th>
                        <th>Cód. Seq</th>
                        <th>Produto</th>
                        <th>Embalagem</th>
                        <th>Qtd</th>
                        <th>Valor Unit.</th>
                        <th>Valor Item</th>
                        <th>Custo Bruto</th>
                        <th>ICMS ST</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPedido.produtos.map((produto) => (
                        <tr key={produto.id}>
                          <td>{produto.codigo_fornecedor || '-'}</td>
                          <td>{produto.cod_seq || '-'}</td>
                          <td>{produto.produto_receber}</td>
                          <td>{produto.embalagem || '-'}</td>
                          <td>{produto.quantidade}</td>
                          <td>R$ {formatBRL(produto.valor_unitario)}</td>
                          <td>R$ {formatBRL(produto.valor_item)}</td>
                          <td>{produto.custo_bruto != null ? `R$ ${formatBRL(produto.custo_bruto)}` : '-'}</td>
                          <td>{produto.valor_icms_st != null ? `R$ ${formatBRL(produto.valor_icms_st)}` : '-'}</td>
                          <td>
                            <button className="danger" onClick={() => handleDeleteProduto(produto.id)} style={{ padding: '3px 8px', fontSize: '12px' }}>Deletar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>Nenhum produto cadastrado</p>
              )}

              <h4>Boletos:</h4>
              {selectedPedido.boletos && selectedPedido.boletos.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Valor</th>
                      <th>Vencimento</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPedido.boletos.map((boleto) => (
                      <tr key={boleto.id}>
                        <td>{boleto.numero_boleto || '-'}</td>
                        <td>R$ {formatBRL(boleto.valor)}</td>
                        <td>{new Date(boleto.data_vencimento).toLocaleDateString('pt-BR')}</td>
                        <td>{boleto.status_pagamento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>Nenhum boleto cadastrado</p>
              )}

              <h4>Nota Fiscal:</h4>
              {selectedPedido.notaFiscal && (
                <p style={{ marginBottom: '8px' }}>
                  <strong>Número:</strong> {selectedPedido.notaFiscal.numero_nota_fiscal || '-'}<br/>
                  <a href={`/api/${selectedPedido.notaFiscal.caminho_arquivo}`} target="_blank" rel="noopener noreferrer">
                    Baixar Nota Fiscal (PDF)
                  </a>
                  <button
                    className="danger btn-sm"
                    onClick={handleDeleteNotaFiscal}
                    style={{ marginLeft: '10px' }}
                  >
                    Remover
                  </button>
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '400px' }}>
                <input
                  type="text"
                  placeholder="Número da nota fiscal (opcional)"
                  value={notaFiscalNumero}
                  onChange={(e) => setNotaFiscalNumero(e.target.value)}
                />
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setNotaFiscalFile(e.target.files[0] || null)}
                />
                <button
                  onClick={handleUploadNotaFiscal}
                  disabled={uploadingNota}
                  className="btn-sm"
                  style={{ alignSelf: 'flex-start' }}
                >
                  {uploadingNota ? 'Enviando...' : selectedPedido.notaFiscal ? 'Substituir Nota Fiscal' : 'Anexar Nota Fiscal'}
                </button>
              </div>
            </div>

            <div className="modal-buttons">
              <button className="secondary" onClick={() => setShowDetailsModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {showAddProdutoModal && selectedPedido && (
        <div className="modal active">
          <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Adicionar Produto ao Pedido {selectedPedido.numero_pedido}</h3>

            <form onSubmit={handleAddProduto}>
              <div className="form-group">
                <label>Código do Fornecedor</label>
                <input
                  type="text"
                  value={produtoFormData.codigo_fornecedor}
                  onChange={(e) => setProdutoFormData({ ...produtoFormData, codigo_fornecedor: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Cód. Seq</label>
                <input
                  type="text"
                  value={produtoFormData.cod_seq}
                  onChange={(e) => setProdutoFormData({ ...produtoFormData, cod_seq: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Produto a Receber *</label>
                <input
                  type="text"
                  value={produtoFormData.produto_receber}
                  onChange={(e) => setProdutoFormData({ ...produtoFormData, produto_receber: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Embalagem</label>
                <input
                  type="text"
                  value={produtoFormData.embalagem}
                  onChange={(e) => setProdutoFormData({ ...produtoFormData, embalagem: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Quantidade *</label>
                <input
                  type="number"
                  step="0.01"
                  value={produtoFormData.quantidade}
                  onChange={(e) => setProdutoFormData({ ...produtoFormData, quantidade: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Valor Unitário (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={produtoFormData.valor_unitario}
                  onChange={(e) => setProdutoFormData({ ...produtoFormData, valor_unitario: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Valor Item (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={produtoFormData.valor_item}
                  onChange={(e) => setProdutoFormData({ ...produtoFormData, valor_item: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Custo Bruto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={produtoFormData.custo_bruto}
                  onChange={(e) => setProdutoFormData({ ...produtoFormData, custo_bruto: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Valor ICMS ST (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={produtoFormData.valor_icms_st}
                  onChange={(e) => setProdutoFormData({ ...produtoFormData, valor_icms_st: e.target.value })}
                />
              </div>

              <div className="modal-buttons">
                <button type="button" className="secondary" onClick={handleCloseProdutoModal}>Cancelar</button>
                <button type="submit">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Pedidos;
