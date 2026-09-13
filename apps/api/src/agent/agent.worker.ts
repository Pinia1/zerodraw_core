import { createAgentModuleContext, MySqlStorage } from '@zeroDraw/agent';
import { setAgentRuntimeLogger } from '@zeroDraw/agent-worker/runtime';
import { startAgentWorkerChild } from '@zeroDraw/agent-worker/worker';
import { buildAgentWorkerConfig } from './setup';

const config = buildAgentWorkerConfig();
const ctx = createAgentModuleContext(config);
setAgentRuntimeLogger(config.logger);

startAgentWorkerChild({
  tooling: ctx.toolingCatalog,
  createStorage: (meta) => new MySqlStorage(meta.id),
  harnessIdleCloseMs: config.env.AGENT_HARNESS_IDLE_MS,
});
