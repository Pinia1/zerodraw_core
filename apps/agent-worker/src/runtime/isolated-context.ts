import type { AgentSessionMeta } from './types/session';
import { noopSandboxRuntime } from './sandbox';

/** Worker 子进程内 harness 的 toolContext：工具走 IPC，不装配宿主 capability */
export interface IsolatedAgentToolContext {
  userId: number;
  sessionId: string;
  capabilities: Record<string, never>;
  sandboxRuntime: typeof noopSandboxRuntime;
}

export function createIsolatedToolContext(meta: AgentSessionMeta): IsolatedAgentToolContext {
  return {
    userId: meta.userId,
    sessionId: meta.id,
    capabilities: {},
    sandboxRuntime: noopSandboxRuntime,
  };
}
