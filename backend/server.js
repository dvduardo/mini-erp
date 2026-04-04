import 'dotenv/config';
import app from './src/app.js';
import { databaseReady } from './src/config/database.js';
import { ensureUploadsDir, warnIfUsingLocalUploadsInProduction } from './src/config/storage.js';

const PORT = process.env.PORT || 5001;

await databaseReady;
ensureUploadsDir();
warnIfUsingLocalUploadsInProduction();

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`💪 API disponível em http://localhost:${PORT}/api`);
});
