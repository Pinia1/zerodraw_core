import { getAgentLogger } from '../../../config';
import type { HostToolExecutor } from '../tool-executor';
import { AgentWorkerSlot, type HarnessLifecycleHandler } from './worker-slot';

export type WorkerSlotCrashHandler = (slotId: number, sessionIds: string[]) => void;

export interface AgentWorkerPoolOptions {
  size: number;
  toolExecutor: HostToolExecutor;
  onHarnessLifecycle?: HarnessLifecycleHandler;
  onSlotCrash?: WorkerSlotCrashHandler;
}

/**
 * Worker 池：多个 fork 子进程 + session 亲和性。
 * 同一 sessionId 始终路由到同一 slot（harness 状态在子进程内存中）。
 */
export class AgentWorkerPool {
  private readonly slots: AgentWorkerSlot[];
  /** sessionId → slotId */
  private readonly sessionToSlot = new Map<string, number>();
  private readonly onSlotCrash?: WorkerSlotCrashHandler;

  constructor(options: AgentWorkerPoolOptions) {
    this.onSlotCrash = options.onSlotCrash;
    const size = Math.max(1, options.size);
    this.slots = Array.from({ length: size }, (_, id) => {
      return new AgentWorkerSlot(
        id,
        options.toolExecutor,
        (slotId) => this.handleSlotCrash(slotId),
        options.onHarnessLifecycle,
      );
    });
    getAgentLogger().info('[Agent Worker Pool] initialized', { size });
  }

  get size(): number {
    return this.slots.length;
  }

  /** 为 session 选取 slot（已有绑定则复用，否则按最少负载分配） */
  async acquireForSession(sessionId: string): Promise<AgentWorkerSlot> {
    const existingSlotId = this.sessionToSlot.get(sessionId);
    if (existingSlotId !== undefined) {
      const slot = this.slots[existingSlotId];
      await slot.ensureReady();
      return slot;
    }

    const slot = this.pickLeastLoadedSlot();
    await slot.ensureReady();
    this.sessionToSlot.set(sessionId, slot.id);
    slot.boundSessions += 1;
    getAgentLogger().debug('[Agent Worker Pool] session assigned', {
      sessionId,
      slotId: slot.id,
      boundSessions: slot.boundSessions,
    });
    return slot;
  }

  getSlotForSession(sessionId: string): AgentWorkerSlot | undefined {
    const slotId = this.sessionToSlot.get(sessionId);
    if (slotId === undefined) return undefined;
    return this.slots[slotId];
  }

  releaseSession(sessionId: string): void {
    const slotId = this.sessionToSlot.get(sessionId);
    if (slotId === undefined) return;

    this.sessionToSlot.delete(sessionId);
    const slot = this.slots[slotId];
    slot.boundSessions = Math.max(0, slot.boundSessions - 1);
    getAgentLogger().debug('[Agent Worker Pool] session released', {
      sessionId,
      slotId,
      boundSessions: slot.boundSessions,
    });
  }

  shutdownAll(): void {
    for (const slot of this.slots) {
      slot.shutdown();
    }
    this.sessionToSlot.clear();
    getAgentLogger().info('[Agent Worker Pool] shutdown', { size: this.slots.length });
  }

  private pickLeastLoadedSlot(): AgentWorkerSlot {
    return this.slots.reduce((best, slot) =>
      slot.boundSessions < best.boundSessions ? slot : best,
    );
  }

  private handleSlotCrash(slotId: number): void {
    const affectedSessions: string[] = [];
    for (const [sessionId, mappedSlotId] of this.sessionToSlot.entries()) {
      if (mappedSlotId === slotId) {
        affectedSessions.push(sessionId);
        this.sessionToSlot.delete(sessionId);
      }
    }
    const slot = this.slots[slotId];
    slot.boundSessions = 0;
    this.onSlotCrash?.(slotId, affectedSessions);
    getAgentLogger().warn('[Agent Worker Pool] slot crashed, session bindings cleared', {
      slotId,
      sessionCount: affectedSessions.length,
    });
  }
}
