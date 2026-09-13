import type { AgentToolingCatalog } from '@zeroDraw/agent-worker/runtime';
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
}

export function createAgentRuntimeHost(options: CreateAgentRuntimeHostOptions): AgentRuntimeHost {
  const { mode, deps, frontendToolBridge, toolingCatalog } = options;
  return mode === 'worker'
    ? new WorkerRuntimeHost(deps, frontendToolBridge)
    : new InProcessRuntimeHost(deps, frontendToolBridge, toolingCatalog);
}
