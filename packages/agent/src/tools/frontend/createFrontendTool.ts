import type { AgentHarnessTool } from '@earendil-works/pi-agent-core';
import type { Static, TSchema } from '@earendil-works/pi-ai';
import type { ToolKind } from '@zeroDraw/api-contract';
import type { AgentToolContext } from '../../session/types';

export interface CreateFrontendToolOptions<TParameters extends TSchema> {
  name: string;
  description: string;
  label: string;
  parameters: TParameters;
  timeoutMs?: number;
  kind?: Extract<ToolKind, 'frontend'>;
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
      const bridge = toolContext.capabilities['frontend.bridge']!;
      await bridge.preparePending(
        toolCallId,
        name,
        params as Static<TParameters>,
        timeoutMs,
      );

      onUpdate({
        content: [{ type: 'text', text: '等待前端执行…' }],
        details: { status: 'pending_frontend', toolName: name },
      });

      return bridge.wait(toolCallId, name, params as Static<TParameters>, timeoutMs);
    },
  };
}
