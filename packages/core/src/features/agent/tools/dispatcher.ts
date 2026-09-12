import { isFrontendToolName, parseAgentSseToolStart, type AgentSseFrame } from '@zeroDraw/api-contract';
import { httpCompleteFrontendTool } from '../../../services/agent';
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

/** 处理单个 SSE tool_start 帧：在浏览器执行工具并回传 complete。 */
export async function dispatchFrontendToolFromSse({
  sessionId,
  frame,
  config,
  registry,
}: FrontendToolDispatchOptions): Promise<FrontendToolDispatchResult> {
  const toolStart = parseAgentSseToolStart(frame);
  if (!toolStart) return { dispatched: false };
  if (!isFrontendToolName(toolStart.toolName)) return { dispatched: false };
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
    const response = await httpCompleteFrontendTool(sessionId, { toolCallId, result });
    return { dispatched: true, delivered: response.delivered };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const response = await httpCompleteFrontendTool(sessionId, {
      toolCallId,
      isError: true,
      message,
    });
    return { dispatched: true, delivered: response.delivered };
  }
}
