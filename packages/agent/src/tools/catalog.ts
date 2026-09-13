import type { ClientToolDefinition } from '@zeroDraw/api-contract';
import {
  buildRegisteredAgentTools,
  type AgentHarnessToolWithMeta,
  type RegisteredAgentTool,
} from '../framework';
import { createRegisteredClientTool } from './clientTool';
import { createListProjectsTool, createReadProjectTool } from './trusted';

const trustedRegistrations: RegisteredAgentTool[] = [
  {
    kind: 'trusted',
    capabilities: ['project.read'],
    tool: createListProjectsTool(),
  },
  {
    kind: 'trusted',
    capabilities: ['project.read'],
    tool: createReadProjectTool(),
  },
];

export interface CreateAgentToolsOptions {
  /**
   * undefined / [] — 仅 trusted tools（Agent Studio 默认）
   * 非空 — 动态注册 client tools（Studio 页 createSession 注入）
   */
  clientTools?: ClientToolDefinition[] | null;
}

function resolveFrontendRegistrations(
  clientTools?: ClientToolDefinition[] | null,
): RegisteredAgentTool[] {
  if (!clientTools?.length) return [];
  return clientTools.map(createRegisteredClientTool);
}

/** 注册全部 Agent 工具（含 kind / capabilities 元数据）。 */
export function createAgentTools(options?: CreateAgentToolsOptions): AgentHarnessToolWithMeta[] {
  const frontend = resolveFrontendRegistrations(options?.clientTools);
  return buildRegisteredAgentTools([...trustedRegistrations, ...frontend]);
}

export type { AgentHarnessToolWithMeta };
