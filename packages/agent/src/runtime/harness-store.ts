import {
  HarnessSessionStore,
  type AgentToolingCatalog,
  type HarnessSessionBindings,
  type HarnessSessionStoreOptions,
} from '@zeroDraw/agent-worker/runtime';
import { SqliteStorage } from '../storage/sqlite.storage';
import type { AgentSessionMeta, AgentToolContext } from '../session/types';

export type ApiHarnessSessionBindings = Omit<
  HarnessSessionBindings<AgentSessionMeta, AgentToolContext>,
  'createStorage'
>;

export type ApiHarnessSessionStoreOptions = HarnessSessionStoreOptions;

export function createApiHarnessSessionStore(
  toolingCatalog: AgentToolingCatalog,
  bindings: ApiHarnessSessionBindings,
  options?: ApiHarnessSessionStoreOptions,
): HarnessSessionStore<AgentSessionMeta, AgentToolContext> {
  return new HarnessSessionStore(
    toolingCatalog,
    {
      ...bindings,
      createStorage: (meta) => new SqliteStorage(meta.id),
    },
    options,
  );
}
