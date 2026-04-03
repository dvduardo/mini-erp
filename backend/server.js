import dotenv from 'dotenv';
import app from './src/app.js';

// Carregar variáveis de ambiente
dotenv.config();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`💪 API disponível em http://localhost:${PORT}/api`);
});
