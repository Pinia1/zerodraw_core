import type { AgentToolingCatalog } from '@zeroDraw/agent-worker/runtime';
import type { AgentRuntimeObservability } from '../../observability';
import type { AgentRepository } from '../../session/repository';
import type { AgentDeps } from '../../tools';
import type { FrontendToolBridge } from '../../tools/frontend/bridge';
import { InProcessRuntimeHost } from './in-process';
import type { AgentRuntimeHost, AgentRuntimeHostMode } from './types';
import { WorkerRuntimeHost } from './worker/parent-host';

export type {
  AgentRuntimeHost,
  AgentRuntimeHostMode,
  AgentStreamPromptOptions,
} from './types';

export interface CreateAgentRuntimeHostOptions {
  mode: AgentRuntimeHostMode;
  deps: AgentDeps;
  frontendToolBridge: FrontendToolBridge;
  toolingCatalog: AgentToolingCatalog;
  /** worker 模式下的子进程池大小 */
  workerPoolSize?: number;
  /** harness 空闲自动关闭（毫秒） */
  harnessIdleCloseMs?: number;
  observability: AgentRuntimeObservability;
  repository: AgentRepository;
}

export function createAgentRuntimeHost(options: CreateAgentRuntimeHostOptions): AgentRuntimeHost {
  const {
    mode,
    deps,
    frontendToolBridge,
    toolingCatalog,
    workerPoolSize = 1,
    harnessIdleCloseMs = 0,
    observability,
    repository,
  } = options;
  return mode === 'worker'
    ? new WorkerRuntimeHost(deps, frontendToolBridge, workerPoolSize, observability, repository)
    : new InProcessRuntimeHost(
        deps,
        frontendToolBridge,
        toolingCatalog,
        harnessIdleCloseMs,
        observability,
      );
}
