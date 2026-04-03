import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Clientes
export const clientesAPI = {
  getAll: () => api.get('/clientes'),
  getById: (id) => api.get(`/clientes/${id}`),
  create: (data) => api.post('/clientes', data),
  update: (id, data) => api.put(`/clientes/${id}`, data),
  delete: (id) => api.delete(`/clientes/${id}`)
};

// Pedidos
export const pedidosAPI = {
  getAll: () => api.get('/pedidos'),
  getById: (id) => api.get(`/pedidos/${id}`),
  create: (data) => api.post('/pedidos', data),
  update: (id, data) => api.put(`/pedidos/${id}`, data),
  delete: (id) => api.delete(`/pedidos/${id}`)
};

// Produtos do Pedido
export const produtosAPI = {
  getByPedido: (pedido_id) => api.get(`/produtos/pedido/${pedido_id}`),
  getById: (id) => api.get(`/produtos/${id}`),
  create: (data) => api.post('/produtos', data),
  update: (id, data) => api.put(`/produtos/${id}`, data),
  delete: (id) => api.delete(`/produtos/${id}`)
};

// Boletos
export const boletosAPI = {
  getAll: (status = null) => api.get('/boletos', { params: status ? { status } : {} }),
  getById: (id) => api.get(`/boletos/${id}`),
  create: (data) => api.post('/boletos', data),
  update: (id, data) => api.put(`/boletos/${id}`, data),
  delete: (id) => api.delete(`/boletos/${id}`),
  getResumo: () => api.get('/boletos/resumo/financeiro')
};

// Notas Fiscais
export const notasFiscaisAPI = {
  getAll: (pedidoId = null) => api.get('/notas-fiscais', { params: pedidoId ? { pedidoId } : {} }),
  getById: (id) => api.get(`/notas-fiscais/${id}`),
  upload: (formData) => api.post('/notas-fiscais/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/notas-fiscais/${id}`)
};

export default api;
