import type { AgentToolResult } from '@earendil-works/pi-agent-core';
import type { AgentFrontendToolCompleteParams } from '@zeroDraw/api-contract';
import { logger } from '../../../../utils/logger';
import { frontendToolCallRepository } from './repository';

interface PendingFrontendTool {
  sessionId: string;
  toolCallId: string;
  toolName: string;
  args: unknown;
  resolve: (result: AgentToolResult<unknown>) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface FrontendToolCompleteOutcome {
  status: 'not_found' | 'already_settled' | 'settled';
  /** true = 本进程内确实唤醒了对应的 execute() Promise；false = 结果已落库但对话无法自动续接 */
  delivered: boolean;
}

const DEFAULT_TIMEOUT_MS = 60_000;

function pendingKey(sessionId: string, toolCallId: string): string {
  return `${sessionId}:${toolCallId}`;
}

function toToolResult(payload: AgentFrontendToolCompleteParams): AgentToolResult<unknown> {
  const text =
    payload.message ??
    (typeof payload.result === 'string' ? payload.result : JSON.stringify(payload.result ?? null));
  return {
    content: [{ type: 'text', text }],
    details: payload.result,
  };
}

/**
 * 服务端 deferred 前端工具桥：execute() 在 wait() 里挂起，浏览器 complete() 后 resolve。
 *
 * pending 状态持久化到 agent_frontend_tool_calls 表，进程内的 Map 只是唤醒机制
 * （pi-agent-core 的 execute() Promise 本身无法跨进程重启恢复）。落库让 pending
 * 调用可审计、可在进程重启后被识别为 orphaned，而不是静默丢失。
 */
export class FrontendToolBridge {
  private readonly pending = new Map<string, PendingFrontendTool>();

  async wait(
    sessionId: string,
    toolCallId: string,
    toolName: string,
    args: unknown,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ): Promise<AgentToolResult<unknown>> {
    const key = pendingKey(sessionId, toolCallId);
    const existing = this.pending.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      this.pending.delete(key);
    }

    await frontendToolCallRepository.insertPending({
      sessionId,
      toolCallId,
      toolName,
      args,
      expiresAt: Date.now() + timeoutMs,
    });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(key);
        const message = `前端工具 ${toolName} 执行超时`;
        void frontendToolCallRepository.settle(sessionId, toolCallId, 'timeout', null, message);
        reject(new Error(message));
      }, timeoutMs);

      this.pending.set(key, { sessionId, toolCallId, toolName, args, resolve, reject, timer });
      logger.info('[Agent FrontendTool] waiting', { sessionId, toolCallId, toolName });
    });
  }

  async complete(
    sessionId: string,
    input: AgentFrontendToolCompleteParams,
  ): Promise<FrontendToolCompleteOutcome> {
    const key = pendingKey(sessionId, input.toolCallId);
    const waiting = this.pending.get(key);

    const row = await frontendToolCallRepository.findOne(sessionId, input.toolCallId);
    if (!row) return { status: 'not_found', delivered: false };

    if (row.status !== 'pending') {
      logger.info('[Agent FrontendTool] duplicate complete ignored', {
        sessionId,
        toolCallId: input.toolCallId,
        status: row.status,
      });
      // completed/error 说明当年那次调用真的唤醒过 execute()；timeout/orphaned 说明那次已经死透了
      return { status: 'already_settled', delivered: row.status === 'completed' || row.status === 'error' };
    }

    await frontendToolCallRepository.settle(
      sessionId,
      input.toolCallId,
      input.isError ? 'error' : 'completed',
      input.result ?? null,
      input.message ?? null,
    );

    if (!waiting) {
      logger.error('[Agent FrontendTool] complete without live waiter (process restarted?)', undefined, {
        sessionId,
        toolCallId: input.toolCallId,
        toolName: row.toolName,
      });
      return { status: 'settled', delivered: false };
    }

    clearTimeout(waiting.timer);
    this.pending.delete(key);

    logger.info('[Agent FrontendTool] complete', {
      sessionId,
      toolCallId: input.toolCallId,
      toolName: waiting.toolName,
      isError: input.isError ?? false,
    });

    if (input.isError) {
      waiting.reject(new Error(input.message ?? '前端工具执行失败'));
    } else {
      waiting.resolve(toToolResult(input));
    }
    return { status: 'settled', delivered: true };
  }

  async clearSession(sessionId: string): Promise<void> {
    for (const [key, pending] of this.pending.entries()) {
      if (pending.sessionId !== sessionId) continue;
      clearTimeout(pending.timer);
      pending.reject(new Error('会话已关闭'));
      this.pending.delete(key);
    }
    await frontendToolCallRepository.orphanPendingForSession(sessionId, '会话已关闭');
  }

  /** 进程启动时调用：上一次进程生命周期遗留的 pending 记录不可能还有活的 waiter，直接标记为孤儿。 */
  async reconcileOrphaned(): Promise<void> {
    await frontendToolCallRepository.orphanAllPending('服务已重启，原挂起的前端工具调用上下文已丢失');
  }
}

export const frontendToolBridge = new FrontendToolBridge();
