export { configureAgentModule, type AgentModuleConfig } from './config';
export { createAgentModuleContext } from './factory';
export { getAgentModuleContext, type AgentModuleContext } from './context';
export { agentPlugin, type AgentPluginOptions } from './plugin';
export { agentRoutes } from './agent.routes';
export { AgentService, type AgentServiceDeps } from './session/service';
export { AgentRepository } from './session/repository';
export { readMainLaneTranscript, summarizeTranscriptRoles } from './session/history';
export {
  createAgentRuntimeHost,
  type AgentRuntimeHost,
  type CreateAgentRuntimeHostOptions,
} from './runtime/host';
export { AgentWorkerPool } from './runtime/host/worker/worker-pool';
export { createAgentToolingCatalog } from './runtime/tooling-catalog';
export { FrontendToolBridge } from './tools/frontend';
export { SqliteStorage } from './storage/sqlite.storage';
export { AgentObservabilityService } from './observability';
export type { AgentRedisLike, AgentRuntimeSnapshot } from './observability';
export type { AgentDeps } from './tools';
