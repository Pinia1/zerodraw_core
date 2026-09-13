import { randomUUID } from 'node:crypto';
import type { AgentHarnessTool, AgentToolResult } from '@earendil-works/pi-agent-core';
import type { WorkerChildMessage } from './protocol';

type ToolWithKind = AgentHarnessTool<WorkerToolContext, any, any> & {
  kind?: string;
};

type PostToParent = (message: WorkerChildMessage) => void;

interface PendingToolCall {
  resolve: (value: AgentToolResult<unknown>) => void;
  reject: (error: Error) => void;
}

interface PendingPrepare {
  resolve: () => void;
  reject: (error: Error) => void;
}

export interface WorkerToolContext {
  sessionId: string;
  userId: number;
}

export class WorkerToolIpcBridge<TToolContext extends WorkerToolContext> {
  private readonly pending = new Map<string, PendingToolCall>();
  private readonly pendingPrepare = new Map<string, PendingPrepare>();

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

  resolvePrepareResult(requestId: string, ok: boolean, error?: string): void {
    const pending = this.pendingPrepare.get(requestId);
    if (!pending) return;
    this.pendingPrepare.delete(requestId);
    if (!ok) {
      pending.reject(new Error(error ?? '前端工具预注册失败'));
      return;
    }
    pending.resolve();
  }

  private prepareOnHost(input: {
    sessionId: string;
    userId: number;
    toolName: string;
    toolCallId: string;
    params: unknown;
  }): Promise<void> {
    const requestId = randomUUID();
    return new Promise<void>((resolve, reject) => {
      this.pendingPrepare.set(requestId, { resolve, reject });
      this.post({
        type: 'frontend_tool_prepare',
        requestId,
        sessionId: input.sessionId,
        userId: input.userId,
        toolName: input.toolName,
        toolCallId: input.toolCallId,
        params: input.params,
      });
    });
  }

  wrapTools(
    tools: AgentHarnessTool<TToolContext, any, any>[],
  ): AgentHarnessTool<TToolContext, any, any>[] {
    const bridge = this;
    return tools.map((tool) => ({
      ...tool,
      async execute(toolCallId, params, onUpdate, toolContext, _invocation, _context) {
        if ((tool as ToolWithKind).kind === 'frontend') {
          await bridge.prepareOnHost({
            sessionId: toolContext.sessionId,
            userId: toolContext.userId,
            toolName: tool.name,
            toolCallId,
            params,
          });
        }

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
