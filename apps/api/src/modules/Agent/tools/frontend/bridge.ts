import type { AgentToolResult } from '@earendil-works/pi-agent-core';
import type { AgentFrontendToolCompleteParams } from '@zeroDraw/api-contract';
import { logger } from '../../../../utils/logger';

interface PendingFrontendTool {
  sessionId: string;
  toolCallId: string;
  toolName: string;
  args: unknown;
  resolve: (result: AgentToolResult<unknown>) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
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

/** 服务端 deferred 前端工具：execute 在此挂起，浏览器 complete 后 resolve。 */
export class FrontendToolBridge {
  private readonly pending = new Map<string, PendingFrontendTool>();

  wait(
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

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(key);
        reject(new Error(`前端工具 ${toolName} 执行超时`));
      }, timeoutMs);

      this.pending.set(key, {
        sessionId,
        toolCallId,
        toolName,
        args,
        resolve,
        reject,
        timer,
      });

      logger.info('[Agent FrontendTool] waiting', { sessionId, toolCallId, toolName });
    });
  }

  complete(sessionId: string, input: AgentFrontendToolCompleteParams): boolean {
    const key = pendingKey(sessionId, input.toolCallId);
    const pending = this.pending.get(key);
    if (!pending) return false;

    clearTimeout(pending.timer);
    this.pending.delete(key);

    logger.info('[Agent FrontendTool] complete', {
      sessionId,
      toolCallId: input.toolCallId,
      toolName: pending.toolName,
      isError: input.isError ?? false,
    });

    if (input.isError) {
      pending.reject(new Error(input.message ?? '前端工具执行失败'));
      return true;
    }

    pending.resolve(toToolResult(input));
    return true;
  }

  clearSession(sessionId: string): void {
    for (const [key, pending] of this.pending.entries()) {
      if (pending.sessionId !== sessionId) continue;
      clearTimeout(pending.timer);
      pending.reject(new Error('会话已关闭'));
      this.pending.delete(key);
    }
  }
}

export const frontendToolBridge = new FrontendToolBridge();
