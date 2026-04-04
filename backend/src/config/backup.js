import { runBackupJob } from '../../scripts/backup.js';

function isEnabled(value) {
  return value === 'true';
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function runScheduledBackup(trigger) {
  try {
    const result = await runBackupJob({
      trigger,
      logger: console
    });

    console.log(`Backup automático concluído em ${result.backupDir}`);
  } catch (error) {
    console.error(`Falha no backup automático (${trigger}):`, error.message);
  }
}

export function startBackupScheduler() {
  if (!isEnabled(process.env.BACKUP_SCHEDULE_ENABLED)) {
    return;
  }

  const intervalHours = parsePositiveNumber(process.env.BACKUP_INTERVAL_HOURS, 24);
  const intervalMs = intervalHours * 60 * 60 * 1000;

  console.log(`Backup automático ativado a cada ${intervalHours} hora(s)`);

  if (isEnabled(process.env.BACKUP_RUN_ON_START)) {
    setTimeout(() => {
      runScheduledBackup('startup');
    }, 1000);
  }

  const timer = setInterval(() => {
    runScheduledBackup('interval');
  }, intervalMs);

  timer.unref?.();
}
