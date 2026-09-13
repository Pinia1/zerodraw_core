import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

/** 解析 fork 子进程入口（dev 用 .ts + tsx，prod 用 dist .js） */
export function resolveAgentWorkerForkEntry(subpath = 'src/worker/agent.worker.ts'): string {
  const pkgJson = require.resolve('@zeroDraw/agent-worker/package.json');
  const pkgDir = dirname(pkgJson);
  const tsEntry = join(pkgDir, subpath);
  const jsEntry = join(pkgDir, 'dist/worker/agent.worker.js');
  if (existsSync(jsEntry)) return jsEntry;
  return tsEntry;
}
