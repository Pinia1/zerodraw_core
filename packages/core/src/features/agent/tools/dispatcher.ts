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

/** 处理单个 SSE tool_start 帧：在浏览器执行工具并回传 complete。 */
export async function dispatchFrontendToolFromSse({
  sessionId,
  frame,
  config,
  registry,
}: FrontendToolDispatchOptions): Promise<boolean> {
  const toolStart = parseAgentSseToolStart(frame);
  if (!toolStart) return false;
  if (!isFrontendToolName(toolStart.toolName)) return false;
  if (!registry.has(toolStart.toolName)) return false;

  const toolName = toolStart.toolName;
  const toolCallId = toolStart.toolCallId;
  const args = toolStart.args ?? {};

  try {
    if (registry.requiresApproval(toolName)) {
      // 骨架：approval UI 接入后再 complete
      return true;
    }

    const ctx = config.getContext();
    const result = await registry.execute(toolName, args, ctx);
    await httpCompleteFrontendTool(sessionId, { toolCallId, result });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await httpCompleteFrontendTool(sessionId, {
      toolCallId,
      isError: true,
      message,
    });
    return true;
  }
}
