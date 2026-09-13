import type { ClientToolDefinition } from '@zeroDraw/api-contract';
import {
  buildRegisteredAgentTools,
  type AgentHarnessToolWithMeta,
  type RegisteredAgentTool,
} from '../framework';
import { createRegisteredClientTool } from './clientTool';
import { createGenerateImageTool, createListProjectsTool, createReadProjectTool } from './trusted';
import {
  createGetCanvasStateTool,
  createPlaceSvgTool,
  createSwitchDrawToolTool,
} from './frontend/definitions';

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
  {
    kind: 'trusted',
    capabilities: ['generate.submit'],
    tool: createGenerateImageTool(),
  },
];

const defaultFrontendRegistrations: RegisteredAgentTool[] = [
  {
    kind: 'frontend',
    capabilities: ['frontend.bridge'],
    tool: createGetCanvasStateTool(),
  },
  {
    kind: 'frontend',
    capabilities: ['frontend.bridge'],
    tool: createSwitchDrawToolTool(),
  },
  {
    kind: 'frontend',
    capabilities: ['frontend.bridge'],
    tool: createPlaceSvgTool(),
  },
];

export interface CreateAgentToolsOptions {
  /**
   * undefined — 使用后端内置 frontend tools（兼容旧客户端）
   * [] — 仅 trusted tools
   * 非空 — 动态注册 client tools
   */
  clientTools?: ClientToolDefinition[] | null;
}

function resolveFrontendRegistrations(
  clientTools?: ClientToolDefinition[] | null,
): RegisteredAgentTool[] {
  if (clientTools === undefined) return defaultFrontendRegistrations;
  if (clientTools === null || clientTools.length === 0) return [];
  return clientTools.map(createRegisteredClientTool);
}

/** 注册全部 Agent 工具（含 kind / capabilities 元数据）。 */
export function createAgentTools(options?: CreateAgentToolsOptions): AgentHarnessToolWithMeta[] {
  const frontend = resolveFrontendRegistrations(options?.clientTools);
  return buildRegisteredAgentTools([...trustedRegistrations, ...frontend]);
}

export type { AgentHarnessToolWithMeta };
