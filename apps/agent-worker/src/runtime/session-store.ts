import type { Context, SessionMetadata } from '@earendil-works/pi-agent-core';
import type { AgentToolingCatalog, HarnessSessionBindings } from './types/tooling';
import {
  closeHarnessSession,
  openHarnessSession,
  type AgentHarnessBundle,
} from './harness-session';
import { releaseLaneIfBusy } from './lane-ops';
import { getAgentRuntimeLogger } from './types/logger';

export interface HarnessSessionLifecycleHooks<TMeta = unknown> {
  onHarnessOpened?: (sessionId: string, meta: TMeta) => void;
  onHarnessIdleClosed?: (sessionId: string, meta: TMeta) => void;
}

export interface HarnessSessionStoreOptions<TMeta = unknown>
  extends HarnessSessionLifecycleHooks<TMeta> {
  /** 空闲多久后关闭 harness（毫秒）；0 表示禁用 */
  idleCloseMs?: number;
}

function isSuspendedMeta(meta: SessionMetadata): boolean {
  return 'status' in meta && (meta as { status?: string }).status === 'suspended';
}

export class HarnessSessionStore<
  TMeta extends SessionMetadata,
  TToolContext extends object | undefined,
> {
  private readonly cache = new Map<string, AgentHarnessBundle<TMeta, TToolContext>>();
  private readonly sessionMeta = new Map<string, TMeta>();
  private readonly idleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly idleCloseMs: number;
  private readonly onHarnessOpened?: (sessionId: string, meta: TMeta) => void;
  private readonly onHarnessIdleClosed?: (sessionId: string, meta: TMeta) => void;

  constructor(
    private readonly tooling: AgentToolingCatalog,
    private readonly bindings: HarnessSessionBindings<TMeta, TToolContext>,
    options: HarnessSessionStoreOptions<TMeta> = {},
  ) {
    this.idleCloseMs = Math.max(0, options.idleCloseMs ?? 0);
    this.onHarnessOpened = options.onHarnessOpened;
    this.onHarnessIdleClosed = options.onHarnessIdleClosed;
  }

  async get(meta: TMeta, context: Context): Promise<AgentHarnessBundle<TMeta, TToolContext>> {
    this.cancelIdleClose(meta.id);
    this.sessionMeta.set(meta.id, meta);

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
    this.onHarnessOpened?.(meta.id, meta);
    return entry;
  }

  /** prompt / resume 完成后调用：延迟关闭内存中的 harness（DB session 仍保留） */
  scheduleIdleClose(sessionId: string, context: Context): void {
    if (this.idleCloseMs <= 0) return;
    if (!this.cache.has(sessionId)) return;

    const meta = this.sessionMeta.get(sessionId);
    if (meta && isSuspendedMeta(meta)) return;

    this.cancelIdleClose(sessionId);

    const timer = setTimeout(() => {
      void this.runIdleClose(sessionId, context);
    }, this.idleCloseMs);
    timer.unref?.();

    this.idleTimers.set(sessionId, timer);
    getAgentRuntimeLogger().debug('[HarnessSessionStore] idle close scheduled', {
      sessionId,
      idleCloseMs: this.idleCloseMs,
    });
  }

  async close(
    sessionId: string,
    context: Context,
  ): Promise<{ meta?: TMeta; hadHarness: boolean }> {
    this.cancelIdleClose(sessionId);
    const meta = this.sessionMeta.get(sessionId);
    this.sessionMeta.delete(sessionId);

    const entry = this.cache.get(sessionId);
    if (!entry) return { meta, hadHarness: false };
    this.cache.delete(sessionId);
    await closeHarnessSession(entry, context);
    return { meta, hadHarness: true };
  }

  async closeAll(context: Context): Promise<void> {
    for (const sessionId of this.idleTimers.keys()) {
      this.cancelIdleClose(sessionId);
    }
    this.sessionMeta.clear();

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
    this.cancelIdleClose(sessionId);
    const meta = this.sessionMeta.get(sessionId);
    const hadHarness = this.cache.has(sessionId);
    this.sessionMeta.delete(sessionId);
    this.cache.delete(sessionId);
    if (hadHarness && meta) this.onHarnessIdleClosed?.(sessionId, meta);
  }

  private cancelIdleClose(sessionId: string): void {
    const timer = this.idleTimers.get(sessionId);
    if (!timer) return;
    clearTimeout(timer);
    this.idleTimers.delete(sessionId);
  }

  private async runIdleClose(sessionId: string, context: Context): Promise<void> {
    this.idleTimers.delete(sessionId);
    if (!this.cache.has(sessionId)) return;

    const meta = this.sessionMeta.get(sessionId);
    if (meta && isSuspendedMeta(meta)) {
      this.scheduleIdleClose(sessionId, context);
      return;
    }

    getAgentRuntimeLogger().info('[HarnessSessionStore] idle close', { sessionId });
    const idleMeta = this.sessionMeta.get(sessionId);
    await this.close(sessionId, context);
    if (idleMeta) this.onHarnessIdleClosed?.(sessionId, idleMeta);
  }
}
