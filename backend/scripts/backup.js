import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.join(backendRoot, 'backups');
const backupDir = path.join(backupRoot, timestamp);
const sqliteDbPath = path.join(backendRoot, 'database.sqlite');
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(backendRoot, 'uploads');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }

  const stats = fs.statSync(sourcePath);

  if (stats.isDirectory()) {
    fs.cpSync(sourcePath, targetPath, { recursive: true });
  } else {
    fs.copyFileSync(sourcePath, targetPath);
  }

  return true;
}

function backupPostgres() {
  if (!process.env.DATABASE_URL) {
    return false;
  }

  const outputFile = path.join(backupDir, 'database.sql');
  const result = spawnSync(
    'pg_dump',
    ['--file', outputFile, process.env.DATABASE_URL],
    { stdio: 'inherit' }
  );

  if (result.error) {
    throw new Error(
      'Falha ao executar pg_dump. Instale o cliente PostgreSQL ou use backups automáticos do provedor gerenciado.'
    );
  }

  if (result.status !== 0) {
    throw new Error(`pg_dump terminou com código ${result.status}`);
  }

  return true;
}

function writeManifest(details) {
  const manifestPath = path.join(backupDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(details, null, 2));
}

ensureDir(backupDir);

const backedUpUploads = copyIfExists(uploadsDir, path.join(backupDir, 'uploads'));

let backupMode = 'sqlite';
let databaseArtifactCreated = false;

if (process.env.DATABASE_URL) {
  backupMode = 'postgres';
  databaseArtifactCreated = backupPostgres();
} else {
  databaseArtifactCreated = copyIfExists(sqliteDbPath, path.join(backupDir, 'database.sqlite'));
}

writeManifest({
  created_at: new Date().toISOString(),
  mode: backupMode,
  database_artifact_created: databaseArtifactCreated,
  uploads_artifact_created: backedUpUploads,
  uploads_dir: uploadsDir
});

console.log(`Backup concluido em ${backupDir}`);
