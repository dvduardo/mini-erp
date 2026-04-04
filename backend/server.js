import 'dotenv/config';
import app from './src/app.js';
import { databaseReady } from './src/config/database.js';
import { ensureUploadsDir, warnIfUsingLocalUploadsInProduction } from './src/config/storage.js';

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '127.0.0.1';

await databaseReady;
ensureUploadsDir();
warnIfUsingLocalUploadsInProduction();

app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 http://${HOST}:${PORT}`);
  console.log(`💪 API disponível em http://${HOST}:${PORT}/api`);
});
