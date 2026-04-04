import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from 'child_process';
import { uploadBackupDirectoryToDrive } from './googleDrive.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');

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

function resolveBackupConfig(env = process.env) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupRoot = env.BACKUP_DIR
    ? path.resolve(env.BACKUP_DIR)
    : path.join(backendRoot, 'backups');
  const backupDir = path.join(backupRoot, timestamp);
  const sqliteDbPath = path.join(backendRoot, 'database.sqlite');
  const uploadsDir = env.UPLOADS_DIR
    ? path.resolve(env.UPLOADS_DIR)
    : path.join(backendRoot, 'uploads');

  return {
    backupRoot,
    backupDir,
    sqliteDbPath,
    uploadsDir
  };
}

function backupPostgres(outputFile, env = process.env) {
  if (!env.DATABASE_URL) {
    return false;
  }

  const result = spawnSync(
    'pg_dump',
    ['--file', outputFile, env.DATABASE_URL],
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

function writeManifest(backupDir, details) {
  const manifestPath = path.join(backupDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(details, null, 2));
}

function pruneOldBackups(backupRoot, retentionDays, logger = console) {
  const parsedRetention = Number(retentionDays);

  if (!Number.isFinite(parsedRetention) || parsedRetention <= 0 || !fs.existsSync(backupRoot)) {
    return [];
  }

  const cutoff = Date.now() - parsedRetention * 24 * 60 * 60 * 1000;
  const deleted = [];
  const entries = fs.readdirSync(backupRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const entryPath = path.join(backupRoot, entry.name);
    const stats = fs.statSync(entryPath);

    if (stats.mtimeMs >= cutoff) {
      continue;
    }

    fs.rmSync(entryPath, { recursive: true, force: true });
    deleted.push(entry.name);
  }

  if (deleted.length > 0) {
    logger.log(`Backups locais removidos por retenção: ${deleted.join(', ')}`);
  }

  return deleted;
}

function shouldUploadToDrive(env = process.env) {
  return env.GOOGLE_DRIVE_BACKUP_ENABLED === 'true';
}

export async function runBackupJob({ env = process.env, logger = console, trigger = 'manual' } = {}) {
  const { backupRoot, backupDir, sqliteDbPath, uploadsDir } = resolveBackupConfig(env);

  ensureDir(backupDir);

  const backedUpUploads = copyIfExists(uploadsDir, path.join(backupDir, 'uploads'));
  const databaseArtifactPath = env.DATABASE_URL
    ? path.join(backupDir, 'database.sql')
    : path.join(backupDir, 'database.sqlite');

  let backupMode = 'sqlite';
  let databaseArtifactCreated = false;

  if (env.DATABASE_URL) {
    backupMode = 'postgres';
    databaseArtifactCreated = backupPostgres(databaseArtifactPath, env);
  } else {
    databaseArtifactCreated = copyIfExists(sqliteDbPath, databaseArtifactPath);
  }

  const manifest = {
    created_at: new Date().toISOString(),
    trigger,
    mode: backupMode,
    database_artifact_created: databaseArtifactCreated,
    uploads_artifact_created: backedUpUploads,
    uploads_dir: uploadsDir
  };

  writeManifest(backupDir, manifest);

  const deletedBackups = pruneOldBackups(backupRoot, env.BACKUP_RETENTION_DAYS, logger);
  let driveUpload = { uploaded: false };

  if (shouldUploadToDrive(env)) {
    driveUpload = await uploadBackupDirectoryToDrive({
      backupDir,
      driveFolderId: env.GOOGLE_DRIVE_FOLDER_ID,
      env,
      logger
    });
  }

  const result = {
    backupDir,
    backupMode,
    databaseArtifactCreated,
    uploadsArtifactCreated: backedUpUploads,
    deletedBackups,
    driveUpload
  };

  logger.log(`Backup concluido em ${backupDir}`);
  return result;
}

async function main() {
  await runBackupJob();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
