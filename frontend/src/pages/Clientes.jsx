import React, { useState, useEffect } from 'react';
import { clientesAPI } from '../services/api';

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    razao_social: '',
    nome_fantasia: '',
    email: '',
    telefone: '',
    cpf_cnpj: '',
    inscricao_estadual: '',
    endereco: '',
    bairro: '',
    cidade: '',
    cep: ''
  });

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const response = await clientesAPI.getAll();
      setClientes(response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (cliente = null) => {
    if (cliente) {
      setEditingId(cliente.id);
      setFormData(cliente);
    } else {
      setEditingId(null);
      setFormData({
        nome: '',
        razao_social: '',
        nome_fantasia: '',
        email: '',
        telefone: '',
        cpf_cnpj: '',
        inscricao_estadual: '',
        endereco: '',
        bairro: '',
        cidade: '',
        cep: ''
      });
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
        await clientesAPI.update(editingId, formData);
      } else {
        await clientesAPI.create(formData);
      }
      
      loadClientes();
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente: ' + error.response?.data?.error || error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este cliente?')) {
      try {
        await clientesAPI.delete(id);
        loadClientes();
      } catch (error) {
        console.error('Erro ao deletar cliente:', error);
        alert('Erro ao deletar cliente');
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Clientes</h2>
        <button onClick={() => handleOpenModal()}>+ Novo Cliente</button>
      </div>

      {loading ? (
        <p className="loading">Carregando clientes...</p>
      ) : clientes.length === 0 ? (
        <p className="empty">Nenhum cliente cadastrado</p>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nome Fantasia</th>
                <th>Razão Social</th>
                <th>CNPJ</th>
                <th>Telefone</th>
                <th>Cidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.nome_fantasia || cliente.nome}</td>
                  <td>{cliente.razao_social || '-'}</td>
                  <td>{cliente.cpf_cnpj || '-'}</td>
                  <td>{cliente.telefone || '-'}</td>
                  <td>{cliente.cidade || '-'}</td>
                  <td>
                    <button onClick={() => handleOpenModal(cliente)}>Editar</button>
                    <button 
                      className="danger" 
                      onClick={() => handleDelete(cliente.id)}
                    >
                      Deletar
                    </button>
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
            <h3>{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nome / Contato *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome do contato"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Nome Fantasia</label>
                  <input
                    type="text"
                    value={formData.nome_fantasia || ''}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    placeholder="Ex: Supermercado XYZ"
                  />
                </div>

                <div className="form-group">
                  <label>Telefone</label>
                  <input
                    type="text"
                    value={formData.telefone || ''}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Razão Social</label>
                  <input
                    type="text"
                    value={formData.razao_social || ''}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    placeholder="Ex: Empresa LTDA"
                  />
                </div>

                <div className="form-group">
                  <label>CNPJ</label>
                  <input
                    type="text"
                    value={formData.cpf_cnpj || ''}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Inscrição Estadual</label>
                  <input
                    type="text"
                    value={formData.inscricao_estadual || ''}
                    onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                    placeholder="IE"
                  />
                </div>

                <div className="form-group">
                  <label>CEP</label>
                  <input
                    type="text"
                    value={formData.cep || ''}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <div className="form-row full">
                <div className="form-group">
                  <label>Endereço</label>
                  <input
                    type="text"
                    value={formData.endereco || ''}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua/Avenida, número"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Bairro</label>
                  <input
                    type="text"
                    value={formData.bairro || ''}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    placeholder="Nome do bairro"
                  />
                </div>

                <div className="form-group">
                  <label>Cidade</label>
                  <input
                    type="text"
                    value={formData.cidade || ''}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="Nome da cidade"
                  />
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

export default Clientes;
