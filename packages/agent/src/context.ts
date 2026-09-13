import type { AgentRuntimeHost } from './runtime/host/types';
import type { AgentToolingCatalog } from '@zeroDraw/agent-worker/runtime';
import type { AgentRepository } from './session/repository';
import type { AgentService } from './session/service';
import type { FrontendToolBridge } from './tools/frontend/bridge';

export interface AgentModuleContext {
  repository: AgentRepository;
  frontendToolBridge: FrontendToolBridge;
  toolingCatalog: AgentToolingCatalog;
  runtimeHost: AgentRuntimeHost;
  service: AgentService;
}

let moduleContext: AgentModuleContext | null = null;

export function setAgentModuleContext(context: AgentModuleContext): void {
  moduleContext = context;
}

export function getAgentModuleContext(): AgentModuleContext {
  if (!moduleContext) {
    throw new Error('@zeroDraw/agent: register agentPlugin or call createAgentModuleContext() first');
  }
  return moduleContext;
}
