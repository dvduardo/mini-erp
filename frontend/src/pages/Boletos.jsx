import React, { useState, useEffect } from 'react';
import { boletosAPI, pedidosAPI } from '../services/api';
import Toast from '../components/Toast';
import { formatBRL } from '../utils/format';
import { getApiErrorMessage } from '../utils/apiError';

function Boletos() {
  const [boletos, setBoletos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [formData, setFormData] = useState({
    pedido_id: '',
    numero_boleto: '',
    valor: '',
    data_vencimento: '',
    status_pagamento: 'pendente'
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadBoletos();
  }, [filtro]);

  const loadData = async () => {
    try {
      setLoading(true);
      const pedidosRes = await pedidosAPI.getAll();
      setPedidos(pedidosRes.data);
      loadBoletos();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setToast({
        message: getApiErrorMessage(error, 'Não foi possível carregar os dados dos boletos agora.', 'Você parece estar sem conexão para carregar os dados dos boletos.'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBoletos = async () => {
    try {
      const response = await boletosAPI.getAll(filtro || null);
      setBoletos(response.data);
    } catch (error) {
      console.error('Erro ao carregar boletos:', error);
      setToast({
        message: getApiErrorMessage(error, 'Não foi possível carregar os boletos agora.', 'Você parece estar sem conexão para carregar os boletos.'),
        type: 'error'
      });
    }
  };

  const handleOpenModal = (boleto = null) => {
    if (boleto) {
      setEditingId(boleto.id);
      setFormData({
        pedido_id: boleto.pedido_id,
        numero_boleto: boleto.numero_boleto || '',
        valor: boleto.valor,
        data_vencimento: boleto.data_vencimento.split('T')[0],
        status_pagamento: boleto.status_pagamento
      });
    } else {
      setEditingId(null);
      setFormData({
        pedido_id: '',
        numero_boleto: '',
        valor: '',
        data_vencimento: '',
        status_pagamento: 'pendente'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handlePedidoChange = (pedidoId) => {
    const pedidoSelecionado = pedidos.find((pedido) => String(pedido.id) === String(pedidoId));
    const valorPedido = pedidoSelecionado?.total_pedido;

    setFormData((currentData) => ({
      ...currentData,
      pedido_id: pedidoId,
      valor: valorPedido !== undefined && valorPedido !== null ? String(valorPedido) : currentData.valor
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = { ...formData, valor: parseFloat(formData.valor) };

      if (editingId) {
        await boletosAPI.update(editingId, data);
        setToast({ message: 'Boleto atualizado com sucesso.', type: 'success' });
      } else {
        await boletosAPI.create(data);
        setToast({ message: 'Boleto cadastrado com sucesso.', type: 'success' });
      }

      loadBoletos();
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar boleto:', error);
      setToast({
        message: getApiErrorMessage(error, 'Não foi possível salvar o boleto agora.', 'Você parece estar sem conexão para salvar o boleto.'),
        type: 'error'
      });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este boleto?')) {
      try {
        await boletosAPI.delete(id);
        loadBoletos();
        setToast({ message: 'Boleto removido com sucesso.', type: 'info' });
      } catch (error) {
        console.error('Erro ao deletar boleto:', error);
        setToast({
          message: getApiErrorMessage(error, 'Não foi possível remover o boleto agora.', 'Você parece estar sem conexão para remover o boleto.'),
          type: 'error'
        });
      }
    }
  };

  const handleTogglePagamento = async (boleto) => {
    try {
      const novoStatus = boleto.status_pagamento === 'pendente' ? 'recebido' : 'pendente';
      const dataPagamento = novoStatus === 'recebido' ? new Date().toISOString().split('T')[0] : null;

      await boletosAPI.update(boleto.id, { status_pagamento: novoStatus, data_pagamento: dataPagamento });
      loadBoletos();
      setToast({ message: `Boleto marcado como ${novoStatus}.`, type: 'success' });
    } catch (error) {
      console.error('Erro ao atualizar boleto:', error);
      setToast({
        message: getApiErrorMessage(error, 'Não foi possível atualizar o status do boleto agora.', 'Você parece estar sem conexão para atualizar o status do boleto.'),
        type: 'error'
      });
    }
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <h2>Boletos</h2>
        <button onClick={() => handleOpenModal()}>+ Novo Boleto</button>
      </div>

      <div className="form-group" style={{ marginBottom: '20px', maxWidth: '220px' }}>
        <label>Filtrar por status:</label>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="recebido">Recebido</option>
          <option value="vencido">Vencido</option>
        </select>
      </div>

      {loading ? (
        <p className="loading">Carregando boletos...</p>
      ) : boletos.length === 0 ? (
        <div className="empty-state">
          <p>{filtro ? `Nenhum boleto com status "${filtro}".` : 'Nenhum boleto cadastrado ainda.'}</p>
          {!filtro && <button onClick={() => handleOpenModal()}>+ Criar primeiro boleto</button>}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Recebido?</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {boletos.map((boleto) => (
                <tr key={boleto.id}>
                  <td>{boleto.numero_boleto || '-'}</td>
                  <td>{boleto.numero_pedido}</td>
                  <td>{boleto.cliente_nome}</td>
                  <td>R$ {formatBRL(boleto.valor)}</td>
                  <td>{new Date(boleto.data_vencimento).toLocaleDateString('pt-BR')}</td>
                  <td>{boleto.status_pagamento}</td>
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={boleto.status_pagamento === 'recebido'}
                      onChange={() => handleTogglePagamento(boleto)}
                    />
                  </td>
                  <td>
                    <div className="btn-group">
                      <button onClick={() => handleOpenModal(boleto)}>Editar</button>
                      <button className="danger" onClick={() => handleDelete(boleto.id)}>Deletar</button>
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
            <div className="modal-header">
              <h3>{editingId ? 'Editar Boleto' : 'Novo Boleto'}</h3>
              <button type="button" className="modal-close" aria-label="Fechar janela" onClick={handleCloseModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Pedido *</label>
                  <select
                    value={formData.pedido_id}
                    onChange={(e) => handlePedidoChange(e.target.value)}
                    required
                    disabled={editingId !== null}
                  >
                    <option value="">Selecione um pedido</option>
                    {pedidos.map((pedido) => (
                      <option key={pedido.id} value={pedido.id}>
                        {pedido.numero_pedido} - {pedido.cliente_nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Número do Boleto</label>
                  <input
                    type="text"
                    value={formData.numero_boleto}
                    onChange={(e) => setFormData({ ...formData, numero_boleto: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Data de Vencimento *</label>
                  <input
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row full">
                <div className="form-group">
                  <label>Status do Pagamento</label>
                  <select
                    value={formData.status_pagamento}
                    onChange={(e) => setFormData({ ...formData, status_pagamento: e.target.value })}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="recebido">Recebido</option>
                    <option value="vencido">Vencido</option>
                  </select>
                </div>
              </div>

              <div className="modal-buttons">
                <button type="button" className="secondary" onClick={handleCloseModal}>Cancelar</button>
                <button type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Boletos;
