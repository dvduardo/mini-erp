import express from 'express';
import {
  getProdutosByPedido,
  getProdutoById,
  createProduto,
  updateProduto,
  deleteProduto
} from '../controllers/produtoController.js';

const router = express.Router();

// Rotas para produtos de um pedido
router.get('/pedido/:pedido_id', getProdutosByPedido);
router.get('/:id', getProdutoById);
router.post('/', createProduto);
router.put('/:id', updateProduto);
router.delete('/:id', deleteProduto);

export default router;
