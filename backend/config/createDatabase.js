import mariadb from 'mariadb';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Ensure the configured MariaDB database exists (no-op if already present).
 * Uses connection credentials from `backend/.env`.
 */
export async function createDatabaseIfNotExists() {
  const conn = await mariadb.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS
  });
  try {
    const dbName = process.env.DB_NAME;
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database '${dbName}' checked or created`);
  } finally {
    await conn.end();
  }
}

// Allow running once from terminal: `node backend/config/createDatabase.js`
const isDirectRun = process.argv[1]?.endsWith('createDatabase.js');
if (isDirectRun) {
  createDatabaseIfNotExists()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Create DB failed:', err);
        process.exit(1);
      });
}
