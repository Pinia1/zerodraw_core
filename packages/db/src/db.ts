import BetterSqlite3 from 'better-sqlite3';

export type SqliteDatabase = InstanceType<typeof BetterSqlite3>;
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../../../.env') });

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL ?? 'file:./data/app.db';
  const raw = url.startsWith('file:') ? url.slice('file:'.length) : url;
  return path.isAbsolute(raw) ? raw : path.resolve(__dirname, '../../..', raw);
}

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite: SqliteDatabase = new BetterSqlite3(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export const sqliteDb: SqliteDatabase = sqlite;

export async function testConnection() {
  try {
    sqlite.prepare('SELECT 1').get();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

export async function closeConnection() {
  try {
    sqlite.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}
