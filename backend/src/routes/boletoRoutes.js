import express from 'express';
import {
  getBoletos,
  getBoletoById,
  createBoleto,
  updateBoleto,
  deleteBoleto,
  getResumo
} from '../controllers/boletoController.js';

const router = express.Router();

// Rotas de Boletos
router.get('/resumo/financeiro', getResumo);
router.get('/', getBoletos);
router.get('/:id', getBoletoById);
router.post('/', createBoleto);
router.put('/:id', updateBoleto);
router.delete('/:id', deleteBoleto);

export default router;
