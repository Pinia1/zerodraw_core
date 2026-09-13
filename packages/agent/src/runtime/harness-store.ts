import {
  HarnessSessionStore,
  type AgentToolingCatalog,
  type HarnessSessionBindings,
} from '@zeroDraw/agent-worker/runtime';
import { MySqlStorage } from '../storage/mysql.storage';
import type { AgentSessionMeta, AgentToolContext } from '../session/types';

export type ApiHarnessSessionBindings = Omit<
  HarnessSessionBindings<AgentSessionMeta, AgentToolContext>,
  'createStorage'
>;

export function createApiHarnessSessionStore(
  toolingCatalog: AgentToolingCatalog,
  bindings: ApiHarnessSessionBindings,
): HarnessSessionStore<AgentSessionMeta, AgentToolContext> {
  return new HarnessSessionStore(toolingCatalog, {
    ...bindings,
    createStorage: (meta) => new MySqlStorage(meta.id),
  });
}
