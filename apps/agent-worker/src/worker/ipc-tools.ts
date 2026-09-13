import { randomUUID } from 'node:crypto';
import type { AgentHarnessTool, AgentToolResult } from '@earendil-works/pi-agent-core';
import type { WorkerChildMessage } from './protocol';

type PostToParent = (message: WorkerChildMessage) => void;

interface PendingToolCall {
  resolve: (value: AgentToolResult<unknown>) => void;
  reject: (error: Error) => void;
}

export interface WorkerToolContext {
  sessionId: string;
  userId: number;
}

export class WorkerToolIpcBridge<TToolContext extends WorkerToolContext> {
  private readonly pending = new Map<string, PendingToolCall>();

  constructor(private readonly post: PostToParent) {}

  resolveToolResult(requestId: string, ok: boolean, result?: unknown, error?: string): void {
    const pending = this.pending.get(requestId);
    if (!pending) return;
    this.pending.delete(requestId);
    if (!ok) {
      pending.reject(new Error(error ?? '工具执行失败'));
      return;
    }
    const toolResult = result as AgentToolResult<unknown>;
    pending.resolve(toolResult);
  }

  wrapTools(
    tools: AgentHarnessTool<TToolContext, any, any>[],
  ): AgentHarnessTool<TToolContext, any, any>[] {
    const bridge = this;
    return tools.map((tool) => ({
      ...tool,
      async execute(toolCallId, params, onUpdate, toolContext, _invocation, _context) {
        onUpdate({
          content: [{ type: 'text', text: '等待宿主执行工具…' }],
          details: { status: 'pending_host', toolName: tool.name },
        });

        const requestId = randomUUID();
        return new Promise<AgentToolResult<unknown>>((resolve, reject) => {
          bridge.pending.set(requestId, { resolve, reject });
          bridge.post({
            type: 'tool_execute',
            requestId,
            sessionId: toolContext.sessionId,
            userId: toolContext.userId,
            toolName: tool.name,
            toolCallId,
            params,
          });
        });
      },
    }));
  }
}
