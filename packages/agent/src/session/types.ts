import {
  AGENT_MAIN_LANE,
  type AgentSessionMeta,
  type AgentSessionStatus,
} from '@zeroDraw/agent-worker/runtime';
import type { AgentCapabilityMap } from '../framework/capabilities';
import { buildAgentCapabilityMap } from '../framework/capabilities';
import { noopSandboxRuntime, type SandboxRuntime } from '../framework/sandbox';
import type { AgentDeps } from '../tools';
import type { FrontendToolBridge } from '../tools/frontend';

export { AGENT_MAIN_LANE, type AgentSessionMeta, type AgentSessionStatus };

/** 会话运行期工具上下文：仅暴露已装配的 capability（execute 时按工具声明再裁剪） */
export interface AgentToolContext {
  userId: number;
  sessionId: string;
  /** 完整装配或按工具裁剪后的 capability 子集 */
  capabilities: Partial<AgentCapabilityMap> | AgentCapabilityMap;
  sandboxRuntime: SandboxRuntime;
}

export interface CreateAgentToolContextOptions {
  userId: number;
  sessionId: string;
  deps: AgentDeps;
  frontendTools: FrontendToolBridge;
  sandboxRuntime?: SandboxRuntime;
}

/** 构造 toolContext：由宿主 deps 装配 capability map */
export function createAgentToolContext(options: CreateAgentToolContextOptions): AgentToolContext {
  const { userId, sessionId, deps, frontendTools, sandboxRuntime = noopSandboxRuntime } = options;
  return {
    userId,
    sessionId,
    capabilities: buildAgentCapabilityMap({ userId, sessionId }, deps, frontendTools),
    sandboxRuntime,
  };
}
