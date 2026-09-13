import { configureAgentModule, type AgentModuleConfig } from './config';
import { setAgentModuleContext, type AgentModuleContext } from './context';
import { AgentObservabilityService } from './observability';
import { createAgentRuntimeHost } from './runtime/host';
import { createAgentToolingCatalog } from './runtime/tooling-catalog';
import { AgentRepository } from './session/repository';
import { AgentService } from './session/service';
import { FrontendToolBridge } from './tools/frontend/bridge';

/** 装配 Agent 模块全部运行时实例（Fastify 插件与 worker 子进程共用）。 */
export function createAgentModuleContext(config: AgentModuleConfig): AgentModuleContext {
  configureAgentModule(config);

  const repository = new AgentRepository();
  const frontendToolBridge = new FrontendToolBridge();
  const toolingCatalog = createAgentToolingCatalog();
  const observability = new AgentObservabilityService({
    runtimeHost: config.env.AGENT_RUNTIME_HOST,
    redis: config.redis,
  });
  const runtimeHost = createAgentRuntimeHost({
    mode: config.env.AGENT_RUNTIME_HOST,
    deps: config.deps,
    frontendToolBridge,
    toolingCatalog,
    workerPoolSize: config.env.AGENT_WORKER_POOL_SIZE,
    harnessIdleCloseMs: config.env.AGENT_HARNESS_IDLE_MS,
    observability,
  });
  const service = new AgentService({
    repository,
    runtimeHost,
    frontendToolBridge,
    observability,
  });

  const context: AgentModuleContext = {
    repository,
    frontendToolBridge,
    toolingCatalog,
    runtimeHost,
    service,
    observability,
  };

  setAgentModuleContext(context);
  return context;
}
