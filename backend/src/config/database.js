import sqlite3 from 'sqlite3';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db;
let isPostgres = false;

// Detectar banco de dados baseado em variáveis de ambiente
const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl) {
  // PostgreSQL em produção
  isPostgres = true;
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  pool.on('error', (err) => {
    console.error('Erro na pool PostgreSQL:', err.message);
  });

  db = pool;
  console.log('Conectado ao banco PostgreSQL');
  initializeDatabase();
} else {
  // SQLite em desenvolvimento
  const dbPath = path.join(__dirname, '../../database.sqlite');
  const sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
      console.log('Conectado ao banco SQLite');
      sqliteDb.run('PRAGMA foreign_keys = ON');
      initializeDatabase();
    }
  });
  db = sqliteDb;
}

// Função para converter placeholders de ? para $1, $2, etc (PostgreSQL)
const convertPlaceholders = (sql) => {
  if (!isPostgres) return sql;
  
  let paramIndex = 0;
  return sql.replace(/\?/g, () => {
    paramIndex++;
    return `$${paramIndex}`;
  });
};

// Função para executar queries com promessas
export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (isPostgres) {
      // PostgreSQL
      const convertedSql = convertPlaceholders(sql);
      db.query(convertedSql, params)
        .then(result => {
          resolve({
            id: result.rows[0]?.id,
            changes: result.rowCount
          });
        })
        .catch(reject);
    } else {
      // SQLite
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
      // PostgreSQL
      const convertedSql = convertPlaceholders(sql);
      db.query(convertedSql, params)
        .then(result => {
          resolve(result.rows[0] || null);
        })
        .catch(reject);
    } else {
      // SQLite
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
      // PostgreSQL
      const convertedSql = convertPlaceholders(sql);
      db.query(convertedSql, params)
        .then(result => {
          resolve(result.rows);
        })
        .catch(reject);
    } else {
      // SQLite
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }
  });
};

// Inicializar banco de dados com as tabelas
export function initializeDatabase() {
  const migrationsDir = path.join(__dirname, '../../migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('Pasta de migrações não encontrada. Pulando inicialização.');
    return;
  }

  // Ler arquivos de migração em ordem
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  migrationFiles.forEach(file => {
    const migrationPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    if (isPostgres) {
      // PostgreSQL
      db.query(sql)
        .then(() => {
          console.log(`Migração ${file} executada com sucesso`);
        })
        .catch(err => {
          console.error(`Erro ao executar migração ${file}:`, err.message);
        });
    } else {
      // SQLite
      db.exec(sql, (err) => {
        if (err) {
          console.error(`Erro ao executar migração ${file}:`, err.message);
        } else {
          console.log(`Migração ${file} executada com sucesso`);
        }
      });
    }
  });
}

export default db;

