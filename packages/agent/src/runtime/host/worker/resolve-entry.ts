import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAgentModuleConfig } from '../../../config';

/** 解析 fork 子进程入口（dev 用 .ts + tsx，prod 用 dist .js） */
export function resolveWorkerEntry(): string {
  const configured = getAgentModuleConfig().workerEntryPath;
  if (configured) {
    if (existsSync(configured)) return configured;
    const js = configured.replace(/\.ts$/, '.js');
    if (existsSync(js)) return js;
    return configured;
  }
  const dir = dirname(fileURLToPath(import.meta.url));
  const js = join(dir, 'agent.worker.js');
  if (existsSync(js)) return js;
  return join(dir, 'agent.worker.ts');
}
