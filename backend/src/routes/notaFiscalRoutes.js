import express from 'express';
import {
  getNotasFiscais,
  getNotaFiscalById,
  uploadNotaFiscal,
  deleteNotaFiscal,
  upload
} from '../controllers/notaFiscalController.js';

const router = express.Router();

// Rotas de Notas Fiscais
router.get('/', getNotasFiscais);
router.get('/:id', getNotaFiscalById);
router.post('/upload', upload.single('arquivo'), uploadNotaFiscal);
router.delete('/:id', deleteNotaFiscal);

export default router;
