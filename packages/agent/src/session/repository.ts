import {
  agentBranchEntry,
  agentBranchMeta,
  agentEntry,
  agentListValue,
  agentPromptRun,
  agentScalarValue,
  agentSession,
  agentSessionEvent,
  agentUsageLedger,
  and,
  desc,
  eq,
  sql,
} from '@zeroDraw/db';
import { randomUUID } from 'crypto';
import { getAgentDb } from '../config';
import { zeroUsage } from '../usage/utils';
import { readSessionMetadata, writeSessionMetadata } from './metadata';
import type { AgentSessionMeta, AgentSessionStatus } from './types';
import type { ClientToolDefinition } from '@zeroDraw/api-contract';

type AgentSessionRow = typeof agentSession.$inferSelect;

function toMeta(row: AgentSessionRow): AgentSessionMeta {
  const metadata = readSessionMetadata(row.metadata);
  return {
    id: row.id,
    createdAt: row.createdAt,
    storageVersion: row.storageVersion,
    userId: row.userId,
    title: row.title ?? null,
    status: row.status,
    projectId: row.projectId ?? null,
    clientTools: metadata.clientTools,
  };
}

export interface CreateAgentSessionData {
  id?: string;
  userId: number;
  title?: string;
  projectId?: string;
  runtimeHost?: 'inprocess' | 'worker';
  clientTools?: ClientToolDefinition[];
}

export class AgentRepository {
  async create({
    id,
    userId,
    title,
    projectId,
    runtimeHost,
    clientTools,
  }: CreateAgentSessionData): Promise<AgentSessionMeta> {
    const sessionId = id ?? randomUUID();
    const now = Date.now();
    await getAgentDb().insert(agentSession).values({
      id: sessionId,
      userId,
      status: 'active',
      title: title ?? null,
      createdAt: now,
      parentSessionId: null,
      storageVersion: 1,
      metadata: writeSessionMetadata({ clientTools }),
      messageCount: 0,
      usagePayload: zeroUsage(),
      nextSeq: 1,
      projectId: projectId ?? null,
      lastActivityAt: now,
      promptCount: 0,
      runtimeHost: runtimeHost ?? null,
    });
    const row = await this.findRow(sessionId);
    if (!row) throw new Error(`Failed to create agent session ${sessionId}`);
    return toMeta(row);
  }

  private async findRow(id: string): Promise<AgentSessionRow | null> {
    const [row] = await getAgentDb().select().from(agentSession).where(eq(agentSession.id, id));
    return row ?? null;
  }

  async findById(id: string): Promise<AgentSessionMeta | null> {
    const row = await this.findRow(id);
    return row ? toMeta(row) : null;
  }

  async findOwner(id: string): Promise<{ userId: number; status: AgentSessionStatus } | null> {
    const [row] = await getAgentDb()
      .select({ userId: agentSession.userId, status: agentSession.status })
      .from(agentSession)
      .where(eq(agentSession.id, id));
    return row ?? null;
  }

  async list(userId: number, page: number, pageSize: number) {
    const conditions = [eq(agentSession.userId, userId)];
    const [totalRows, rows] = await Promise.all([
      getAgentDb().select({ count: sql<number>`count(*)` }).from(agentSession).where(and(...conditions)),
      getAgentDb()
        .select()
        .from(agentSession)
        .where(and(...conditions))
        .orderBy(desc(agentSession.updatedAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    ]);
    return {
      list: rows.map(toMeta),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async updateStatus(id: string, status: AgentSessionStatus): Promise<void> {
    await getAgentDb().update(agentSession).set({ status }).where(eq(agentSession.id, id));
  }

  async updateTitle(id: string, title: string | null): Promise<void> {
    await getAgentDb().update(agentSession).set({ title }).where(eq(agentSession.id, id));
  }

  /** 硬删除会话及其全部条目/值/分支/用量。 */
  async delete(id: string): Promise<void> {
    await getAgentDb().transaction(async (tx) => {
      await tx.delete(agentEntry).where(eq(agentEntry.sessionId, id));
      await tx.delete(agentBranchEntry).where(eq(agentBranchEntry.sessionId, id));
      await tx.delete(agentBranchMeta).where(eq(agentBranchMeta.sessionId, id));
      await tx.delete(agentScalarValue).where(eq(agentScalarValue.sessionId, id));
      await tx.delete(agentListValue).where(eq(agentListValue.sessionId, id));
      await tx.delete(agentUsageLedger).where(eq(agentUsageLedger.sessionId, id));
      await tx.delete(agentPromptRun).where(eq(agentPromptRun.sessionId, id));
      await tx.delete(agentSessionEvent).where(eq(agentSessionEvent.sessionId, id));
      await tx.delete(agentSession).where(eq(agentSession.id, id));
    });
  }
}
