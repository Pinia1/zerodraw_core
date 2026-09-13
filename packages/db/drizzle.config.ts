import { defineConfig } from 'drizzle-kit';
import fs from 'node:fs';
import path from 'node:path';

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL ?? 'file:./data/app.db';
  const raw = url.startsWith('file:') ? url.slice('file:'.length) : url;
  const resolved = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), '../../', raw);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: resolveDbPath(),
  },
  verbose: true,
  strict: true,
});
