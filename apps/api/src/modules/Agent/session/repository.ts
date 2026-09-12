import {
  agentBranchEntry,
  agentBranchMeta,
  agentEntry,
  agentListValue,
  agentScalarValue,
  agentSession,
  agentUsageLedger,
  and,
  desc,
  eq,
  sql,
} from '@zeroDraw/db';
import type { Usage } from '@earendil-works/pi-ai';
import { randomUUID } from 'crypto';
import { db } from '../../../db';
import type { AgentSessionMeta, AgentSessionStatus } from './types';

/** pi-agent 会话初始统计量（Usage 全零）。 */
const zeroUsage = (): Usage => ({
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
});

type AgentSessionRow = typeof agentSession.$inferSelect;

function toMeta(row: AgentSessionRow): AgentSessionMeta {
  return {
    id: row.id,
    createdAt: row.createdAt,
    storageVersion: row.storageVersion,
    userId: row.userId,
    title: row.title ?? null,
    status: row.status,
  };
}

export interface CreateAgentSessionData {
  id?: string;
  userId: number;
  title?: string;
}

class AgentRepository {
  async create({ id, userId, title }: CreateAgentSessionData): Promise<AgentSessionMeta> {
    const sessionId = id ?? randomUUID();
    await db.insert(agentSession).values({
      id: sessionId,
      userId,
      status: 'active',
      title: title ?? null,
      createdAt: Date.now(),
      parentSessionId: null,
      storageVersion: 1,
      metadata: null,
      messageCount: 0,
      usagePayload: zeroUsage(),
      nextSeq: 1,
    });
    const row = await this.findRow(sessionId);
    if (!row) throw new Error(`Failed to create agent session ${sessionId}`);
    return toMeta(row);
  }

  private async findRow(id: string): Promise<AgentSessionRow | null> {
    const [row] = await db.select().from(agentSession).where(eq(agentSession.id, id));
    return row ?? null;
  }

  async findById(id: string): Promise<AgentSessionMeta | null> {
    const row = await this.findRow(id);
    return row ? toMeta(row) : null;
  }

  async findOwner(id: string): Promise<{ userId: number; status: AgentSessionStatus } | null> {
    const [row] = await db
      .select({ userId: agentSession.userId, status: agentSession.status })
      .from(agentSession)
      .where(eq(agentSession.id, id));
    return row ?? null;
  }

  async list(userId: number, page: number, pageSize: number) {
    const conditions = [eq(agentSession.userId, userId)];
    const [totalRows, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(agentSession).where(and(...conditions)),
      db
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
    await db.update(agentSession).set({ status }).where(eq(agentSession.id, id));
  }

  async updateTitle(id: string, title: string | null): Promise<void> {
    await db.update(agentSession).set({ title }).where(eq(agentSession.id, id));
  }

  /** 硬删除会话及其全部条目/值/分支/用量。 */
  async delete(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(agentEntry).where(eq(agentEntry.sessionId, id));
      await tx.delete(agentBranchEntry).where(eq(agentBranchEntry.sessionId, id));
      await tx.delete(agentBranchMeta).where(eq(agentBranchMeta.sessionId, id));
      await tx.delete(agentScalarValue).where(eq(agentScalarValue.sessionId, id));
      await tx.delete(agentListValue).where(eq(agentListValue.sessionId, id));
      await tx.delete(agentUsageLedger).where(eq(agentUsageLedger.sessionId, id));
      await tx.delete(agentSession).where(eq(agentSession.id, id));
    });
  }
}

export const agentRepository = new AgentRepository();
