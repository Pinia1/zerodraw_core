import {
  buildRegisteredAgentTools,
  type AgentHarnessToolWithMeta,
  type RegisteredAgentTool,
} from '../framework';
import { createGenerateImageTool, createListProjectsTool, createReadProjectTool } from './trusted';
import {
  createGetCanvasStateTool,
  createPlaceSvgTool,
  createSwitchDrawToolTool,
} from './frontend/definitions';

const toolRegistrations: RegisteredAgentTool[] = [
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

/** 注册全部 Agent 工具（含 kind / capabilities 元数据）。 */
export function createAgentTools(): AgentHarnessToolWithMeta[] {
  return buildRegisteredAgentTools(toolRegistrations);
}

export type { AgentHarnessToolWithMeta };
