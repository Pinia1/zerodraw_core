import type { Context, SessionMetadata } from '@earendil-works/pi-agent-core';
import type { AgentToolingCatalog, HarnessSessionBindings } from './types/tooling';
import {
  closeHarnessSession,
  openHarnessSession,
  type AgentHarnessBundle,
} from './harness-session';
import { releaseLaneIfBusy } from './lane-ops';

export class HarnessSessionStore<
  TMeta extends SessionMetadata,
  TToolContext extends object | undefined,
> {
  private readonly cache = new Map<string, AgentHarnessBundle<TMeta, TToolContext>>();

  constructor(
    private readonly tooling: AgentToolingCatalog,
    private readonly bindings: HarnessSessionBindings<TMeta, TToolContext>,
  ) {}

  async get(meta: TMeta, context: Context): Promise<AgentHarnessBundle<TMeta, TToolContext>> {
    const { toolsFingerprint } = this.tooling.getTooling();
    const hit = this.cache.get(meta.id);

    if (hit) {
      if (hit.toolsFingerprint !== toolsFingerprint) {
        await this.close(meta.id, context);
      } else {
        await releaseLaneIfBusy(hit.lane, context).catch(() => undefined);
        return hit;
      }
    }

    const entry = await openHarnessSession(meta, context, this.tooling, this.bindings);
    this.cache.set(meta.id, entry);
    return entry;
  }

  async close(sessionId: string, context: Context): Promise<void> {
    const entry = this.cache.get(sessionId);
    if (!entry) return;
    this.cache.delete(sessionId);
    await closeHarnessSession(entry, context);
  }

  async closeAll(context: Context): Promise<void> {
    const entries = [...this.cache.values()];
    this.cache.clear();
    await Promise.all(
      entries.map(async (entry) => {
        try {
          await closeHarnessSession(entry, context);
        } catch {
          // 尽力而为
        }
      }),
    );
  }

  evict(sessionId: string): void {
    this.cache.delete(sessionId);
  }
}
