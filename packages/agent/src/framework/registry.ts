import type { AgentHarnessTool } from '@earendil-works/pi-agent-core';
import type { AgentCapability, ToolKind, ToolRegistrationMeta } from '@zeroDraw/api-contract';
import type { AgentToolContext } from '../session/types';
import { pickAgentCapabilities, type AgentCapabilityMap } from './capabilities';

export interface RegisteredAgentTool extends ToolRegistrationMeta {
  tool: AgentHarnessTool<AgentToolContext, any, any>;
}

export interface AgentHarnessToolWithMeta extends AgentHarnessTool<AgentToolContext, any, any> {
  kind: ToolKind;
  capabilities: readonly AgentCapability[];
}

function narrowToolContext(
  ctx: AgentToolContext,
  allowed: readonly AgentCapability[],
): AgentToolContext {
  return {
    userId: ctx.userId,
    sessionId: ctx.sessionId,
    capabilities: pickAgentCapabilities(ctx.capabilities as AgentCapabilityMap, allowed),
    sandboxRuntime: ctx.sandboxRuntime,
  };
}

function wrapToolExecute(
  tool: AgentHarnessTool<AgentToolContext, any, any>,
  meta: ToolRegistrationMeta,
): AgentHarnessTool<AgentToolContext, any, any> {
  return {
    ...tool,
    async execute(toolCallId, params, onUpdate, toolContext, invocation, context) {
      const narrowed = narrowToolContext(toolContext, meta.capabilities);

      if (meta.kind === 'sandbox') {
        return tool.execute(toolCallId, params, onUpdate, narrowed, invocation, context);
      }

      return tool.execute(toolCallId, params, onUpdate, narrowed, invocation, context);
    },
  };
}

/** 注册工具并附加 kind/capabilities 元数据，execute 时自动裁剪 capability */
export function buildRegisteredAgentTools(
  registrations: RegisteredAgentTool[],
): AgentHarnessToolWithMeta[] {
  return registrations.map(({ tool, kind, capabilities }) => {
    const wrapped = wrapToolExecute(tool, { kind, capabilities });
    return Object.assign(wrapped, { kind, capabilities }) as AgentHarnessToolWithMeta;
  });
}

export function summarizeToolRegistry(tools: AgentHarnessToolWithMeta[]) {
  return tools.map((tool) => ({
    name: tool.name,
    kind: tool.kind,
    capabilities: [...tool.capabilities],
  }));
}
