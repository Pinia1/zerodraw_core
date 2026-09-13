import type { AgentToolResult } from '@earendil-works/pi-agent-core';
import type { ProjectDetail } from '@zeroDraw/api-contract';
import type { GenerateParams } from '../types/generate';
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

export interface GenerateSubmitCapability {
  submit(params: GenerateParams): ReturnType<AgentDeps['generate']['run']>;
}

export interface FrontendBridgeCapability {
  wait(
    toolCallId: string,
    toolName: string,
    args: unknown,
    timeoutMs?: number,
  ): Promise<AgentToolResult<unknown>>;
}

export interface AgentCapabilityMap {
  'project.read': ProjectReadCapability;
  'generate.submit': GenerateSubmitCapability;
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
    'generate.submit': {
      submit: (params) => deps.generate.run(userId, params),
    },
    'frontend.bridge': {
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
