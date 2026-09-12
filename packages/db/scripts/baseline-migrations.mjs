/**
 * 将已有数据库标记为已应用全部 drizzle 迁移（__drizzle_migrations 为空时使用）。
 * 适用场景：表结构已通过 db:push 或手工 SQL 建好，但迁移 journal 未记录。
 *
 * 用法：pnpm db:baseline
 */
import { createHash } from 'crypto';
import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

function hashMigration(sql) {
  return createHash('sha256').update(sql).digest('hex');
}

const drizzleDir = join(__dirname, '../drizzle');
const files = readdirSync(drizzleDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const conn = await createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'zerodraw',
  multipleStatements: true,
});

await conn.query(`
  CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  )
`);

const [existing] = await conn.query('SELECT hash FROM __drizzle_migrations');
const applied = new Set(existing.map((r) => r.hash));

let inserted = 0;
for (const file of files) {
  const sql = readFileSync(join(drizzleDir, file), 'utf8');
  const hash = hashMigration(sql);
  if (applied.has(hash)) {
    console.log(`skip ${file} (already recorded)`);
    continue;
  }
  await conn.query('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)', [
    hash,
    Date.now(),
  ]);
  console.log(`recorded ${file}`);
  inserted++;
}

console.log(`done: ${inserted} migration(s) baselined`);
await conn.end();
