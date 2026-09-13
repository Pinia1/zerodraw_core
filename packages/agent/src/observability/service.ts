import type {
  AgentAdminSessionsQuery,
  AgentAdminUsageQuery,
  AgentCloseReason,
  AgentRuntimeHostKind,
} from '@zeroDraw/api-contract';
import { getAgentEnv, getAgentLogger } from '../config';
import { AgentObservabilityRepository } from './repository';
import { AgentRuntimeStore } from './runtime-store';
import type {
  AgentObservabilityContext,
  AgentRedisLike,
  FinishPromptRunInput,
  RecordEventInput,
  StartPromptRunInput,
} from './types';

export interface AgentObservabilityOptions {
  runtimeHost: AgentRuntimeHostKind;
  redis?: AgentRedisLike;
  harnessIdleMs?: number;
}

export class AgentObservabilityService {
  readonly runtimeStore: AgentRuntimeStore;
  private readonly repo = new AgentObservabilityRepository();

  constructor(options: AgentObservabilityOptions) {
    this.runtimeStore = new AgentRuntimeStore(
      options.runtimeHost,
      options.redis,
      options.harnessIdleMs,
    );
  }

  get runtimeHost(): AgentRuntimeHostKind {
    return this.runtimeStore.configuredRuntimeHost;
  }

  /** 启动时清理僵尸 prompt run、可选 idle 会话关闭 */
  async reconcileOnStartup(options?: {
    beforeIdleClose?: (sessionId: string) => Promise<void>;
  }): Promise<void> {
    const env = getAgentEnv();
    const staleCutoff = Date.now() - env.AGENT_PROMPT_RUN_STALE_MS;
    const staleRuns = await this.repo.listStaleRunningPromptRuns(staleCutoff);

    for (const run of staleRuns) {
      await this.finishPromptRun(
        {
          sessionId: run.sessionId,
          userId: run.userId,
          projectId: run.projectId ?? null,
        },
        {
          runId: run.id,
          status: 'aborted',
          errorMessage: 'Stale prompt run reconciled on startup',
        }
      );
    }

    if (staleRuns.length > 0) {
      getAgentLogger().info('[AgentObservability] reconciled stale prompt runs', {
        count: staleRuns.length,
      });
    }

    if (env.AGENT_SESSION_IDLE_CLOSE_MS <= 0) return;

    const idleCutoff = Date.now() - env.AGENT_SESSION_IDLE_CLOSE_MS;
    const idleSessions = await this.repo.listSessionsIdleSince(idleCutoff);

    for (const session of idleSessions) {
      const runtime = await this.runtimeStore.get(session.id);
      if (runtime?.loaded || runtime?.executing) continue;

      const running = await this.repo.listRunningPromptRuns(session.id);
      if (running.length > 0) continue;

      await options?.beforeIdleClose?.(session.id);

      await this.onSessionClosed(
        {
          sessionId: session.id,
          userId: session.userId,
          projectId: session.projectId ?? null,
        },
        'idle'
      );
    }

    if (idleSessions.length > 0) {
      getAgentLogger().info('[AgentObservability] idle session reconcile checked', {
        candidates: idleSessions.length,
      });
    }
  }

  async onSessionCreated(
    ctx: AgentObservabilityContext & { title?: string | null }
  ): Promise<void> {
    await this.recordEvent({
      ...ctx,
      eventType: 'session_created',
      payload: { title: ctx.title ?? null, runtimeHost: this.runtimeHost },
    });
    await this.runtimeStore.touch({
      sessionId: ctx.sessionId,
      userId: ctx.userId,
      projectId: ctx.projectId ?? null,
      loaded: false,
      executing: false,
      runtimeHost: this.runtimeHost,
      workerSlot: null,
    });
  }

  async onSessionClosed(
    ctx: AgentObservabilityContext,
    closeReason: AgentCloseReason
  ): Promise<void> {
    await this.repo.closeSessionMeta(ctx.sessionId, closeReason);
    await this.recordEvent({
      ...ctx,
      eventType: 'session_closed',
      payload: { closeReason },
    });
    await this.runtimeStore.remove(ctx.sessionId);
  }

  async onSessionSuspended(ctx: AgentObservabilityContext): Promise<void> {
    await this.recordEvent({ ...ctx, eventType: 'session_suspended' });
    await this.runtimeStore.setExecuting(ctx.sessionId, false);
  }

  async onSessionResumed(ctx: AgentObservabilityContext): Promise<void> {
    await this.recordEvent({ ...ctx, eventType: 'session_resumed' });
  }

  async onHarnessOpened(ctx: AgentObservabilityContext): Promise<void> {
    await this.recordEvent({ ...ctx, eventType: 'harness_opened' });
    const current = await this.runtimeStore.get(ctx.sessionId);
    if (current) {
      await this.runtimeStore.touch({ ...current, loaded: true });
    } else {
      await this.runtimeStore.touch({
        sessionId: ctx.sessionId,
        userId: ctx.userId,
        projectId: ctx.projectId ?? null,
        loaded: true,
        executing: false,
        runtimeHost: this.runtimeHost,
        workerSlot: null,
      });
    }
  }

  async onHarnessIdleClosed(ctx: AgentObservabilityContext): Promise<void> {
    await this.recordEvent({ ...ctx, eventType: 'harness_idle_closed' });
    await this.runtimeStore.setLoaded(ctx.sessionId, false);
  }

  async onWorkerAssigned(ctx: AgentObservabilityContext & { workerSlot: number }): Promise<void> {
    await this.repo.updateRunningPromptRunWorkerSlot(ctx.sessionId, ctx.workerSlot);
    await this.recordEvent({
      ...ctx,
      eventType: 'worker_assigned',
      payload: { workerSlot: ctx.workerSlot },
    });
    const current = await this.runtimeStore.get(ctx.sessionId);
    if (current) {
      await this.runtimeStore.touch({ ...current, workerSlot: ctx.workerSlot });
    }
  }

  async onWorkerCrashed(input: {
    workerSlot: number;
    sessionIds: string[];
    errorMessage?: string;
  }): Promise<void> {
    const errorMessage = input.errorMessage ?? `Worker slot #${input.workerSlot} crashed`;

    for (const sessionId of input.sessionIds) {
      const session = await this.repo.findSessionObservabilityContext(sessionId);
      if (!session || session.status === 'closed') continue;

      const ctx: AgentObservabilityContext = {
        sessionId,
        userId: session.userId,
        projectId: session.projectId,
      };

      const runningRuns = await this.repo.listRunningPromptRuns(sessionId);
      for (const run of runningRuns) {
        await this.finishPromptRun(ctx, {
          runId: run.id,
          status: 'failed',
          errorMessage,
        });
      }

      await this.recordEvent({
        ...ctx,
        eventType: 'worker_crashed',
        payload: { workerSlot: input.workerSlot, errorMessage },
      });

      await this.runtimeStore.remove(sessionId);
    }

    getAgentLogger().warn('[AgentObservability] worker crashed', {
      workerSlot: input.workerSlot,
      sessionCount: input.sessionIds.length,
      errorMessage,
    });
  }

  async startPromptRun(input: StartPromptRunInput): Promise<string> {
    await this.repo.touchPrompt(input.sessionId);
    const ledgerFromSeq = await this.repo.readUsageLedgerMaxSeq(input.sessionId);
    const runId = await this.repo.createPromptRun({ ...input, ledgerFromSeq });
    await this.recordEvent({
      sessionId: input.sessionId,
      userId: input.userId,
      projectId: input.projectId,
      eventType: 'prompt_started',
      payload: {
        runId,
        kind: input.kind ?? 'prompt',
        workerSlot: input.workerSlot ?? null,
      },
    });
    const current = await this.runtimeStore.get(input.sessionId);
    await this.runtimeStore.touch({
      sessionId: input.sessionId,
      userId: input.userId,
      projectId: input.projectId ?? null,
      loaded: current?.loaded ?? false,
      executing: true,
      runtimeHost: input.runtimeHost,
      workerSlot: input.workerSlot ?? current?.workerSlot ?? null,
    });
    return runId;
  }

  async finishPromptRun(
    ctx: AgentObservabilityContext,
    input: FinishPromptRunInput
  ): Promise<void> {
    const finished = await this.repo.finishPromptRun(input);
    if (!finished) return;

    const eventType =
      input.status === 'failed' || input.status === 'aborted'
        ? 'prompt_failed'
        : input.status === 'suspended'
          ? 'prompt_suspended'
          : 'prompt_completed';

    await this.recordEvent({
      ...ctx,
      eventType,
      payload: {
        runId: input.runId,
        status: input.status,
        errorMessage: input.errorMessage ?? null,
      },
    });

    await this.runtimeStore.setExecuting(ctx.sessionId, false);
  }

  async recordEvent(input: RecordEventInput): Promise<void> {
    try {
      await this.repo.recordEvent(input);
    } catch (error) {
      getAgentLogger().warn('[AgentObservability] recordEvent failed', {
        sessionId: input.sessionId,
        eventType: input.eventType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overview = await this.repo.getOverview(today.getTime());
    const snapshots = await this.runtimeStore.listAll();
    return {
      ...overview,
      runtime: {
        loadedCount: snapshots.filter((s) => s.loaded).length,
        executingCount: snapshots.filter((s) => s.executing).length,
        runtimeHost: this.runtimeHost,
      },
    };
  }

  listSessions(query: AgentAdminSessionsQuery) {
    return this.repo.listSessionsAdmin(query);
  }

  async getTimeline(sessionId: string) {
    const session = await this.repo.findSessionAdmin(sessionId);
    if (!session) return null;

    const [events, promptRuns, runtime] = await Promise.all([
      this.repo.listSessionEvents(sessionId),
      this.repo.listSessionPromptRuns(sessionId),
      this.runtimeStore.get(sessionId),
    ]);

    return {
      session,
      events,
      promptRuns,
      runtime: runtime
        ? {
            loaded: runtime.loaded,
            executing: runtime.executing,
            workerSlot: runtime.workerSlot,
            heartbeatAt: runtime.heartbeatAt,
          }
        : null,
    };
  }

  aggregateUsage(query: AgentAdminUsageQuery) {
    return this.repo.aggregateUsage(query);
  }

  /** 当前进程/Redis 中登记的全部 runtime 快照（含 loaded=false 的残留条目） */
  async listRuntimeSnapshots() {
    const snapshots = await this.runtimeStore.listAll();
    snapshots.sort((a, b) => b.heartbeatAt - a.heartbeatAt);
    return {
      snapshots,
      loadedCount: snapshots.filter((s) => s.loaded).length,
      executingCount: snapshots.filter((s) => s.executing).length,
    };
  }
}
