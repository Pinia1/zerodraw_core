import type { AgentHarnessTool } from '@earendil-works/pi-agent-core';
import type { Static, TSchema } from '@earendil-works/pi-ai';
import type { FrontendToolName } from '@zeroDraw/api-contract';
import type { AgentToolContext } from '../../session/types';

export interface CreateFrontendToolOptions<TParameters extends TSchema> {
  name: FrontendToolName;
  description: string;
  label: string;
  parameters: TParameters;
  timeoutMs?: number;
}

/** 创建由浏览器执行的服务端 deferred 工具 */
export function createFrontendTool<TParameters extends TSchema>(
  options: CreateFrontendToolOptions<TParameters>,
): AgentHarnessTool<AgentToolContext, TParameters> {
  const { name, description, label, parameters, timeoutMs } = options;

  return {
    name,
    description,
    label,
    parameters,
    async execute(toolCallId, params, onUpdate, toolContext) {
      onUpdate({
        content: [{ type: 'text', text: '等待前端执行…' }],
        details: { status: 'pending_frontend', toolName: name },
      });

      return toolContext.frontendTools.wait(
        toolContext.sessionId,
        toolCallId,
        name,
        params as Static<TParameters>,
        timeoutMs,
      );
    },
  };
}
