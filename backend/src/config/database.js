import sqlite3 from 'sqlite3';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '../../migrations');
const sqliteDbPath = path.join(__dirname, '../../database.sqlite');

const databaseUrl = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';
const allowSqliteInProduction = process.env.ALLOW_SQLITE_IN_PRODUCTION === 'true';
const isPostgres = Boolean(databaseUrl);

const legacyMigrationFiles = [
  '00_init.sql',
  '01_alter_clientes_add_fields.sql',
  '02_alter_pedidos_add_data_emissao.sql',
  '03_alter_pedidos_add_endereco.sql',
  '04_create_pedido_produtos.sql',
  '05_create_users.sql',
  '06_postgres_init_fix.sql',
  '07_sqlite_compatibility_fix.sql'
];

const destructiveMigrationFiles = new Set([
  '06_postgres_init_fix.sql',
  '07_sqlite_compatibility_fix.sql'
]);

let db;

function ensureSafeProductionConfig() {
  if (isProduction && !isPostgres && !allowSqliteInProduction) {
    throw new Error(
      'Produção sem DATABASE_URL configurada. Configure PostgreSQL persistente ou use ALLOW_SQLITE_IN_PRODUCTION=true por sua conta e risco.'
    );
  }

  if (isProduction && !isPostgres && allowSqliteInProduction) {
    console.warn(
      'ALERTA: produção está usando SQLite local. Garanta disco persistente e backup periódico para evitar perda de dados.'
    );
  }
}

async function connectSqlite() {
  return await new Promise((resolve, reject) => {
    const sqliteDb = new sqlite3.Database(sqliteDbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      sqliteDb.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
        if (pragmaErr) {
          reject(pragmaErr);
          return;
        }

        console.log(`Conectado ao banco SQLite em ${sqliteDbPath}`);
        resolve(sqliteDb);
      });
    });
  });
}

async function connectDatabase() {
  ensureSafeProductionConfig();

  if (isPostgres) {
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: isProduction ? { rejectUnauthorized: false } : false
    });

    pool.on('error', (err) => {
      console.error('Erro na pool PostgreSQL:', err.message);
    });

    await pool.query('SELECT 1');
    console.log('Conectado ao banco PostgreSQL');
    return pool;
  }

  return await connectSqlite();
}

function convertPlaceholders(sql) {
  if (!isPostgres) return sql;

  let paramIndex = 0;
  return sql.replace(/\?/g, () => {
    paramIndex += 1;
    return `$${paramIndex}`;
  });
}

async function rawQuery(sql, params = []) {
  if (isPostgres) {
    return await db.query(convertPlaceholders(sql), params);
  }

  return await new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve({ rows });
    });
  });
}

async function rawExec(sql) {
  if (isPostgres) {
    await db.query(sql);
    return;
  }

  await new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (isPostgres) {
      db.query(convertPlaceholders(sql), params)
        .then((result) => {
          resolve({
            id: result.rows[0]?.id,
            changes: result.rowCount
          });
        })
        .catch(reject);
    } else {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    }
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (isPostgres) {
      db.query(convertPlaceholders(sql), params)
        .then((result) => {
          resolve(result.rows[0] || null);
        })
        .catch(reject);
    } else {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }
  });
};

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (isPostgres) {
      db.query(convertPlaceholders(sql), params)
        .then((result) => {
          resolve(result.rows);
        })
        .catch(reject);
    } else {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }
  });
};

async function ensureMigrationsTable() {
  await rawExec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrationSet() {
  const result = await rawQuery('SELECT filename FROM schema_migrations ORDER BY filename');
  return new Set(result.rows.map((row) => row.filename));
}

async function recordMigration(filename) {
  await dbRun(
    'INSERT INTO schema_migrations (filename) VALUES (?) ON CONFLICT(filename) DO NOTHING',
    [filename]
  );
}

async function listAppTables() {
  if (isPostgres) {
    const result = await rawQuery(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name <> 'schema_migrations'
    `);

    return result.rows.map((row) => row.table_name);
  }

  const result = await rawQuery(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
      AND name <> 'schema_migrations'
  `);

  return result.rows.map((row) => row.name);
}

function getOrderedMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

function getFreshDatabaseMigrationPlan(allMigrationFiles) {
  if (isPostgres) {
    return allMigrationFiles.filter((file) => file === '06_postgres_init_fix.sql');
  }

  return allMigrationFiles.filter((file) => file !== '06_postgres_init_fix.sql');
}

async function bootstrapLegacyDatabase(allMigrationFiles) {
  const filesToMark = allMigrationFiles.filter((file) => legacyMigrationFiles.includes(file));

  for (const filename of filesToMark) {
    await recordMigration(filename);
  }

  console.warn(
    `Banco legado detectado sem histórico de migrations. Marcadas como aplicadas: ${filesToMark.join(', ')}`
  );
}

export async function initializeDatabase() {
  const migrationFiles = getOrderedMigrationFiles();

  if (migrationFiles.length === 0) {
    console.log('Pasta de migrações não encontrada ou vazia. Pulando inicialização.');
    return;
  }

  await ensureMigrationsTable();

  let appliedMigrations = await getAppliedMigrationSet();
  const existingTables = await listAppTables();
  const isFreshDatabase = existingTables.length === 0;

  if (appliedMigrations.size === 0 && !isFreshDatabase) {
    await bootstrapLegacyDatabase(migrationFiles);
    appliedMigrations = await getAppliedMigrationSet();
  }

  const pendingMigrations = isFreshDatabase && appliedMigrations.size === 0
    ? getFreshDatabaseMigrationPlan(migrationFiles)
    : migrationFiles.filter((file) => !appliedMigrations.has(file) && !destructiveMigrationFiles.has(file));

  const blockedDestructiveMigrations = migrationFiles.filter(
    (file) => !appliedMigrations.has(file) && destructiveMigrationFiles.has(file)
  );

  if (blockedDestructiveMigrations.length > 0 && !(isFreshDatabase && appliedMigrations.size === 0)) {
    console.warn(
      `Migrations destrutivas bloqueadas para preservar dados: ${blockedDestructiveMigrations.join(', ')}`
    );
  }

  for (const filename of pendingMigrations) {
    const migrationPath = path.join(migrationsDir, filename);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await rawExec(sql);
    await recordMigration(filename);
    console.log(`Migração ${filename} executada com sucesso`);
  }
}

db = await connectDatabase();
await initializeDatabase();

export const databaseReady = Promise.resolve();

export default db;
