import type { AgentToolResult } from '@earendil-works/pi-agent-core';
import type { ProjectDetail } from '@zeroDraw/api-contract';
import type { AgentDeps } from '../tools/deps';
import type { FrontendToolBridge } from '../tools/frontend/bridge';

export interface ProjectReadCapability {
  listProjects(query: {
    page: number;
    pageSize: number;
    keyword?: string;
    deleted?: boolean;
  }): ReturnType<AgentDeps['project']['listProjects']>;
  getProject(projectId: string): Promise<ProjectDetail>;
}

export interface FrontendBridgeCapability {
  preparePending(
    toolCallId: string,
    toolName: string,
    args: unknown,
    timeoutMs?: number,
  ): Promise<void>;
  wait(
    toolCallId: string,
    toolName: string,
    args: unknown,
    timeoutMs?: number,
  ): Promise<AgentToolResult<unknown>>;
}

export interface AgentCapabilityMap {
  'project.read': ProjectReadCapability;
  'frontend.bridge': FrontendBridgeCapability;
}

export type AgentCapability = keyof AgentCapabilityMap;

export function buildAgentCapabilityMap(
  session: { userId: number; sessionId: string },
  deps: AgentDeps,
  frontendBridge: FrontendToolBridge,
): AgentCapabilityMap {
  const { userId, sessionId } = session;

  return {
    'project.read': {
      listProjects: (query) =>
        deps.project.listProjects({
          userId,
          page: query.page,
          pageSize: query.pageSize,
          keyword: query.keyword,
          deleted: query.deleted ?? false,
        }),
      getProject: (projectId) => deps.project.getProject({ id: projectId, userId }),
    },
    'frontend.bridge': {
      preparePending: (toolCallId, toolName, args, timeoutMs) =>
        frontendBridge.preparePending(sessionId, toolCallId, toolName, args, timeoutMs),
      wait: (toolCallId, toolName, args, timeoutMs) =>
        frontendBridge.wait(sessionId, toolCallId, toolName, args, timeoutMs),
    },
  };
}

/** 按工具声明裁剪 capability，未声明的一律不可见 */
export function pickAgentCapabilities(
  full: AgentCapabilityMap,
  allowed: readonly AgentCapability[],
): Partial<AgentCapabilityMap> {
  const entries = allowed.map((key) => {
    const impl = full[key];
    if (!impl) {
      throw new Error(`Capability 未装配: ${key}`);
    }
    return [key, impl] as const;
  });
  return Object.fromEntries(entries) as Partial<AgentCapabilityMap>;
}
