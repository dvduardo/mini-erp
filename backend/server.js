import 'dotenv/config';
import app from './src/app.js';
import { startBackupScheduler } from './src/config/backup.js';
import { databaseReady } from './src/config/database.js';
import { ensureUploadsDir, warnIfUsingLocalUploadsInProduction } from './src/config/storage.js';
import { validateSecurityConfig } from './src/config/security.js';

const PORT = process.env.PORT || 5001;
const isProduction = process.env.NODE_ENV === 'production';
const HOST = process.env.HOST || (isProduction ? '0.0.0.0' : '127.0.0.1');

validateSecurityConfig();
await databaseReady;
ensureUploadsDir();
warnIfUsingLocalUploadsInProduction();
startBackupScheduler();

app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 http://${HOST}:${PORT}`);
  console.log(`💪 API disponível em http://${HOST}:${PORT}/api`);
});
