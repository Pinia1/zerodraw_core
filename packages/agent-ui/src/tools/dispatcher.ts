import { parseAgentSseToolStart, type AgentSseFrame } from '@zeroDraw/api-contract';
import { httpCompleteFrontendTool } from '../services/agent';
import type { AgentFrontendToolsConfig } from './types';
import { FrontendToolRegistry } from './registry';

export interface FrontendToolDispatchOptions {
  sessionId: string;
  frame: AgentSseFrame;
  config: AgentFrontendToolsConfig;
  registry: FrontendToolRegistry;
}

export interface FrontendToolDispatchResult {
  dispatched: boolean;
  /** false = 服务端已找不到对应挂起的执行上下文（进程重启等），对话无法自动续接 */
  delivered?: boolean;
}

const COMPLETE_RETRY_MS = 50;
const COMPLETE_MAX_ATTEMPTS = 20;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isPendingFrontendToolError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('未找到待完成的前端工具调用');
}

/** complete 可能在服务端 insertPending 之前到达，短暂重试消除竞态 */
async function completeFrontendToolWithRetry(
  sessionId: string,
  payload: Parameters<typeof httpCompleteFrontendTool>[1],
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < COMPLETE_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await httpCompleteFrontendTool(sessionId, payload);
    } catch (error) {
      lastError = error;
      if (!isPendingFrontendToolError(error) || attempt === COMPLETE_MAX_ATTEMPTS - 1) {
        throw error;
      }
      await sleep(COMPLETE_RETRY_MS);
    }
  }
  throw lastError;
}

/** 处理单个 SSE tool_start 帧：在浏览器执行工具并回传 complete。 */
export async function dispatchFrontendToolFromSse({
  sessionId,
  frame,
  config,
  registry,
}: FrontendToolDispatchOptions): Promise<FrontendToolDispatchResult> {
  const toolStart = parseAgentSseToolStart(frame);
  if (!toolStart) return { dispatched: false };
  if (!registry.has(toolStart.toolName)) return { dispatched: false };

  const toolName = toolStart.toolName;
  const toolCallId = toolStart.toolCallId;
  const args = toolStart.args ?? {};

  try {
    if (registry.requiresApproval(toolName)) {
      // 骨架：approval UI 接入后再 complete
      return { dispatched: true };
    }

    const ctx = config.getContext();
    const result = await registry.execute(toolName, args, ctx);
    const response = await completeFrontendToolWithRetry(sessionId, { toolCallId, result });
    return { dispatched: true, delivered: response?.delivered };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const response = await completeFrontendToolWithRetry(sessionId, {
      toolCallId,
      isError: true,
      message,
    });
    return { dispatched: true, delivered: response?.delivered };
  }
}
