import type {
  AgentAdminSessionsQuery,
  AgentAdminUsageQuery,
  AgentCloseReason,
  AgentPromptRunStatus,
  AgentRuntimeHostKind,
  AgentSessionEventType,
} from '@zeroDraw/api-contract';
import {
  agentPromptRun,
  agentSession,
  agentSessionEvent,
  agentUsageLedger,
} from '@zeroDraw/db';
import { and, desc, eq, gt, gte, lte, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getAgentDb } from '../config';
import { addUsage, zeroUsage } from '../usage/utils';
import type { Usage } from '@earendil-works/pi-ai';

type SessionRow = typeof agentSession.$inferSelect;

function usageTotals(usage: unknown): { totalTokens: number; totalCost: number } {
  const u = usage as Usage | null | undefined;
  if (!u) return { totalTokens: 0, totalCost: 0 };
  return {
    totalTokens: Number(u.totalTokens ?? 0),
    totalCost: Number(u.cost?.total ?? 0),
  };
}

function toAdminSessionRow(row: SessionRow) {
  return {
    id: row.id,
    userId: row.userId,
    projectId: row.projectId ?? null,
    title: row.title ?? null,
    status: row.status,
    promptCount: row.promptCount,
    lastPromptAt: row.lastPromptAt ?? null,
    lastActivityAt: row.lastActivityAt ?? null,
    createdAt: row.createdAt,
    closedAt: row.closedAt ?? null,
    closeReason: row.closeReason ?? null,
    runtimeHost: row.runtimeHost ?? null,
    usage: row.usagePayload,
  };
}

export class AgentObservabilityRepository {
  async recordEvent(input: {
    sessionId: string;
    userId: number;
    projectId?: string | null;
    eventType: AgentSessionEventType;
    payload?: Record<string, unknown>;
  }): Promise<string> {
    const id = randomUUID();
    const now = Date.now();
    await getAgentDb()
      .insert(agentSessionEvent)
      .values({
        id,
        sessionId: input.sessionId,
        userId: input.userId,
        projectId: input.projectId ?? null,
        eventType: input.eventType,
        payload: input.payload ?? null,
        createdAt: now,
      });
    await getAgentDb()
      .update(agentSession)
      .set({ lastActivityAt: now })
      .where(eq(agentSession.id, input.sessionId));
    return id;
  }

  async touchPrompt(sessionId: string): Promise<void> {
    const now = Date.now();
    await getAgentDb()
      .update(agentSession)
      .set({
        lastPromptAt: now,
        lastActivityAt: now,
        promptCount: sql`${agentSession.promptCount} + 1`,
      })
      .where(eq(agentSession.id, sessionId));
  }

  async closeSessionMeta(
    sessionId: string,
    closeReason: AgentCloseReason,
  ): Promise<void> {
    const now = Date.now();
    await getAgentDb()
      .update(agentSession)
      .set({
        status: 'closed',
        closedAt: now,
        closeReason,
        lastActivityAt: now,
      })
      .where(eq(agentSession.id, sessionId));
  }

  async createPromptRun(input: {
    sessionId: string;
    userId: number;
    projectId?: string | null;
    runtimeHost: AgentRuntimeHostKind;
    workerSlot?: number | null;
    ledgerFromSeq: number;
  }): Promise<string> {
    const id = randomUUID();
    const now = Date.now();
    await getAgentDb().insert(agentPromptRun).values({
      id,
      sessionId: input.sessionId,
      userId: input.userId,
      projectId: input.projectId ?? null,
      status: 'running',
      startedAt: now,
      runtimeHost: input.runtimeHost,
      workerSlot: input.workerSlot ?? null,
      ledgerFromSeq: input.ledgerFromSeq,
    });
    return id;
  }

  async updateRunningPromptRunWorkerSlot(sessionId: string, workerSlot: number): Promise<void> {
    await getAgentDb()
      .update(agentPromptRun)
      .set({ workerSlot })
      .where(and(eq(agentPromptRun.sessionId, sessionId), eq(agentPromptRun.status, 'running')));
  }

  async finishPromptRun(input: {
    runId: string;
    status: AgentPromptRunStatus;
    usage?: Usage | null;
    errorMessage?: string | null;
    workerSlot?: number | null;
  }): Promise<boolean> {
    const now = Date.now();
    const [row] = await getAgentDb()
      .select({
        startedAt: agentPromptRun.startedAt,
        status: agentPromptRun.status,
        sessionId: agentPromptRun.sessionId,
        ledgerFromSeq: agentPromptRun.ledgerFromSeq,
      })
      .from(agentPromptRun)
      .where(eq(agentPromptRun.id, input.runId));
    if (!row || row.status !== 'running') return false;

    let usage = input.usage;
    if (usage == null) {
      const fromSeq = row.ledgerFromSeq ?? 0;
      usage = await this.sumUsageLedgerSince(row.sessionId, fromSeq);
    }

    const durationMs = now - row.startedAt;
    await getAgentDb()
      .update(agentPromptRun)
      .set({
        status: input.status,
        finishedAt: now,
        durationMs,
        usage: usage ?? null,
        errorMessage: input.errorMessage ?? null,
        ...(input.workerSlot != null ? { workerSlot: input.workerSlot } : {}),
      })
      .where(and(eq(agentPromptRun.id, input.runId), eq(agentPromptRun.status, 'running')));
    return true;
  }

  async listStaleRunningPromptRuns(staleBeforeMs: number) {
    return getAgentDb()
      .select({
        id: agentPromptRun.id,
        sessionId: agentPromptRun.sessionId,
        userId: agentPromptRun.userId,
        projectId: agentPromptRun.projectId,
      })
      .from(agentPromptRun)
      .where(
        and(eq(agentPromptRun.status, 'running'), lte(agentPromptRun.startedAt, staleBeforeMs)),
      );
  }

  async listRunningPromptRuns(sessionId: string) {
    return getAgentDb()
      .select({ id: agentPromptRun.id })
      .from(agentPromptRun)
      .where(and(eq(agentPromptRun.sessionId, sessionId), eq(agentPromptRun.status, 'running')));
  }

  async findSessionObservabilityContext(sessionId: string) {
    const [row] = await getAgentDb()
      .select({
        userId: agentSession.userId,
        projectId: agentSession.projectId,
        status: agentSession.status,
      })
      .from(agentSession)
      .where(eq(agentSession.id, sessionId));
    if (!row) return null;
    return {
      sessionId,
      userId: row.userId,
      projectId: row.projectId ?? null,
      status: row.status,
    };
  }

  async listSessionsIdleSince(idleBeforeMs: number) {
    return getAgentDb()
      .select({
        id: agentSession.id,
        userId: agentSession.userId,
        projectId: agentSession.projectId,
      })
      .from(agentSession)
      .where(
        and(
          sql`${agentSession.status} != 'closed'`,
          lte(
            sql`coalesce(${agentSession.lastActivityAt}, ${agentSession.createdAt})`,
            idleBeforeMs,
          ),
        ),
      );
  }

  async readUsageLedgerMaxSeq(sessionId: string): Promise<number> {
    const [row] = await getAgentDb()
      .select({ maxSeq: sql<number>`coalesce(max(${agentUsageLedger.seq}), 0)` })
      .from(agentUsageLedger)
      .where(eq(agentUsageLedger.sessionId, sessionId));
    return Number(row?.maxSeq ?? 0);
  }

  async sumUsageLedgerSince(sessionId: string, afterSeq: number): Promise<Usage> {
    const rows = await getAgentDb()
      .select({ usage: agentUsageLedger.usage })
      .from(agentUsageLedger)
      .where(and(eq(agentUsageLedger.sessionId, sessionId), gt(agentUsageLedger.seq, afterSeq)));

    let total = zeroUsage();
    for (const row of rows) {
      if (row.usage) total = addUsage(total, row.usage as Usage);
    }
    return total;
  }

  async getOverview(todayStartMs: number) {
    const [sessionCounts, promptCounts, usageTotalsRow] = await Promise.all([
      getAgentDb()
        .select({
          status: agentSession.status,
          count: sql<number>`count(*)`,
        })
        .from(agentSession)
        .groupBy(agentSession.status),
      getAgentDb()
        .select({
          totalRuns: sql<number>`count(*)`,
          todayRuns: sql<number>`sum(case when ${agentPromptRun.startedAt} >= ${todayStartMs} then 1 else 0 end)`,
          failedRuns: sql<number>`sum(case when ${agentPromptRun.status} = 'failed' then 1 else 0 end)`,
        })
        .from(agentPromptRun),
      getAgentDb()
        .select({
          totalTokens: sql<number>`coalesce(sum(cast(json_extract(${agentPromptRun.usage}, '$.totalTokens') as integer)), 0)`,
          totalCost: sql<number>`coalesce(sum(cast(json_extract(${agentPromptRun.usage}, '$.cost.total') as real)), 0)`,
        })
        .from(agentPromptRun)
        .where(sql`${agentPromptRun.usage} is not null`),
    ]);

    const sessions = { total: 0, active: 0, suspended: 0, closed: 0 };
    for (const row of sessionCounts) {
      const count = Number(row.count);
      sessions.total += count;
      if (row.status === 'active') sessions.active = count;
      if (row.status === 'suspended') sessions.suspended = count;
      if (row.status === 'closed') sessions.closed = count;
    }

    const prompt = promptCounts[0];
    const usageAgg = usageTotalsRow[0];
    return {
      sessions,
      prompts: {
        totalRuns: Number(prompt?.totalRuns ?? 0),
        todayRuns: Number(prompt?.todayRuns ?? 0),
        failedRuns: Number(prompt?.failedRuns ?? 0),
      },
      usage: {
        totalTokens: Number(usageAgg?.totalTokens ?? 0),
        totalCost: Number(usageAgg?.totalCost ?? 0),
      },
    };
  }

  async listSessionsAdmin(query: AgentAdminSessionsQuery) {
    const conditions = [];
    if (query.status) conditions.push(eq(agentSession.status, query.status));
    if (query.userId) conditions.push(eq(agentSession.userId, query.userId));
    if (query.projectId) conditions.push(eq(agentSession.projectId, query.projectId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRows, rows] = await Promise.all([
      getAgentDb()
        .select({ count: sql<number>`count(*)` })
        .from(agentSession)
        .where(where),
      getAgentDb()
        .select()
        .from(agentSession)
        .where(where)
        .orderBy(desc(agentSession.updatedAt))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
    ]);

    return {
      list: rows.map(toAdminSessionRow),
      total: Number(totalRows[0]?.count ?? 0),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findSessionAdmin(sessionId: string) {
    const [row] = await getAgentDb()
      .select()
      .from(agentSession)
      .where(eq(agentSession.id, sessionId));
    return row ? toAdminSessionRow(row) : null;
  }

  async listSessionEvents(sessionId: string, limit = 200) {
    const rows = await getAgentDb()
      .select()
      .from(agentSessionEvent)
      .where(eq(agentSessionEvent.sessionId, sessionId))
      .orderBy(desc(agentSessionEvent.createdAt))
      .limit(limit);
    return rows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      userId: row.userId,
      projectId: row.projectId ?? null,
      eventType: row.eventType as AgentSessionEventType,
      payload: row.payload ?? null,
      createdAt: row.createdAt,
    }));
  }

  async listSessionPromptRuns(sessionId: string, limit = 100) {
    const rows = await getAgentDb()
      .select()
      .from(agentPromptRun)
      .where(eq(agentPromptRun.sessionId, sessionId))
      .orderBy(desc(agentPromptRun.startedAt))
      .limit(limit);
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt ?? null,
      durationMs: row.durationMs ?? null,
      usage: row.usage ?? null,
      errorMessage: row.errorMessage ?? null,
      runtimeHost: row.runtimeHost ?? null,
      workerSlot: row.workerSlot ?? null,
    }));
  }

  async aggregateUsage(query: AgentAdminUsageQuery) {
    const conditions = [];
    if (query.from) conditions.push(gte(agentPromptRun.startedAt, query.from));
    if (query.to) conditions.push(lte(agentPromptRun.startedAt, query.to));
    if (query.userId) conditions.push(eq(agentPromptRun.userId, query.userId));
    if (query.projectId) conditions.push(eq(agentPromptRun.projectId, query.projectId));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await getAgentDb()
      .select({
        userId: agentPromptRun.userId,
        projectId: agentPromptRun.projectId,
        startedAt: agentPromptRun.startedAt,
        status: agentPromptRun.status,
        usage: agentPromptRun.usage,
      })
      .from(agentPromptRun)
      .where(where);

    type Bucket = {
      key: string;
      userId?: number;
      projectId?: string | null;
      day?: string;
      runCount: number;
      failedCount: number;
      totalTokens: number;
      totalCost: number;
    };

    const buckets = new Map<string, Bucket>();

    for (const row of rows) {
      let key: string;
      const bucket: Bucket = {
        key: '',
        runCount: 0,
        failedCount: 0,
        totalTokens: 0,
        totalCost: 0,
      };

      if (query.groupBy === 'user') {
        key = String(row.userId);
        bucket.userId = row.userId;
      } else if (query.groupBy === 'project') {
        key = row.projectId ?? 'none';
        bucket.projectId = row.projectId ?? null;
      } else {
        const day = new Date(row.startedAt).toISOString().slice(0, 10);
        key = day;
        bucket.day = day;
      }

      bucket.key = key;
      const existing = buckets.get(key) ?? bucket;
      existing.runCount += 1;
      if (row.status === 'failed') existing.failedCount += 1;
      const totals = usageTotals(row.usage);
      existing.totalTokens += totals.totalTokens;
      existing.totalCost += totals.totalCost;
      buckets.set(key, existing);
    }

    return [...buckets.values()].sort((a, b) => b.runCount - a.runCount);
  }
}
