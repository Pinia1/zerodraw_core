import { agentFrontendToolCall, and, eq } from '@zeroDraw/db';
import { db } from '../../../../db';

export type FrontendToolCallStatus = 'pending' | 'completed' | 'error' | 'timeout' | 'orphaned';

export interface FrontendToolCallRow {
  sessionId: string;
  toolCallId: string;
  toolName: string;
  args: unknown;
  status: FrontendToolCallStatus;
  result: unknown;
  message: string | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

class FrontendToolCallRepository {
  async insertPending(row: {
    sessionId: string;
    toolCallId: string;
    toolName: string;
    args: unknown;
    expiresAt: number;
  }): Promise<void> {
    const now = Date.now();
    await db
      .insert(agentFrontendToolCall)
      .values({
        sessionId: row.sessionId,
        toolCallId: row.toolCallId,
        toolName: row.toolName,
        args: row.args as object,
        status: 'pending',
        result: null,
        message: null,
        createdAt: now,
        updatedAt: now,
        expiresAt: row.expiresAt,
      })
      .onDuplicateKeyUpdate({
        set: {
          toolName: row.toolName,
          args: row.args as object,
          status: 'pending',
          result: null,
          message: null,
          updatedAt: now,
          expiresAt: row.expiresAt,
        },
      });
  }

  async findOne(sessionId: string, toolCallId: string): Promise<FrontendToolCallRow | undefined> {
    const [row] = await db
      .select()
      .from(agentFrontendToolCall)
      .where(and(eq(agentFrontendToolCall.sessionId, sessionId), eq(agentFrontendToolCall.toolCallId, toolCallId)));
    return row as FrontendToolCallRow | undefined;
  }

  async settle(
    sessionId: string,
    toolCallId: string,
    status: Extract<FrontendToolCallStatus, 'completed' | 'error' | 'timeout'>,
    result: unknown,
    message: string | null,
  ): Promise<void> {
    await db
      .update(agentFrontendToolCall)
      .set({ status, result: result as object, message, updatedAt: Date.now() })
      .where(and(eq(agentFrontendToolCall.sessionId, sessionId), eq(agentFrontendToolCall.toolCallId, toolCallId)));
  }

  async orphanPendingForSession(sessionId: string, message: string): Promise<void> {
    await db
      .update(agentFrontendToolCall)
      .set({ status: 'orphaned', message, updatedAt: Date.now() })
      .where(and(eq(agentFrontendToolCall.sessionId, sessionId), eq(agentFrontendToolCall.status, 'pending')));
  }

  async orphanAllPending(message: string): Promise<void> {
    await db
      .update(agentFrontendToolCall)
      .set({ status: 'orphaned', message, updatedAt: Date.now() })
      .where(eq(agentFrontendToolCall.status, 'pending'));
  }
}

export const frontendToolCallRepository = new FrontendToolCallRepository();
