import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Importar rotas
import clienteRoutes from './routes/clienteRoutes.js';
import pedidoRoutes from './routes/pedidoRoutes.js';
import produtoRoutes from './routes/produtoRoutes.js';
import boletoRoutes from './routes/boletoRoutes.js';
import notaFiscalRoutes from './routes/notaFiscalRoutes.js';
import authRoutes from './routes/authRoutes.js';

// Importar middleware de autenticação
import { authMiddleware } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const shouldApplyLoginRateLimit = process.env.NODE_ENV === 'production';

// Configurar proxy reverso (necessário para Heroku e X-Forwarded-For)
app.set('trust proxy', 1);

// Middlewares de segurança
app.use(helmet());

// Rate limiter para login (evitar brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  skip: () => !shouldApplyLoginRateLimit // Desativar rate limiter fora de produção
});

// Middlewares gerais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Servir frontend estático em produção
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Rotas públicas (sem autenticação)
app.use('/api/auth', loginLimiter, authRoutes);

// Rotas protegidas (com autenticação)
app.use('/api/clientes', authMiddleware, clienteRoutes);
app.use('/api/pedidos', authMiddleware, pedidoRoutes);
app.use('/api/produtos', authMiddleware, produtoRoutes);
app.use('/api/boletos', authMiddleware, boletoRoutes);
app.use('/api/notas-fiscais', authMiddleware, notaFiscalRoutes);

// Rota health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: err.message 
  });
});

// SPA fallback — serve index.html para rotas não-API (React Router)
app.get('*', (req, res) => {
  const indexPath = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Rota não encontrada' });
  }
});

export default app;
