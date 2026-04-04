import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '../..');

const configuredUploadsDir = process.env.UPLOADS_DIR;

export const uploadsDir = configuredUploadsDir
  ? path.resolve(configuredUploadsDir)
  : path.join(backendRoot, 'uploads');

export function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

export function warnIfUsingLocalUploadsInProduction() {
  if (process.env.NODE_ENV === 'production' && !configuredUploadsDir) {
    console.warn(
      `ALERTA: uploads estão usando armazenamento local em ${uploadsDir}. Use UPLOADS_DIR em disco persistente ou storage externo em produção.`
    );
  }
}
