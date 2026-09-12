import type { AgentFrontendToolsConfig } from '@zeroDraw/core';
import { getCanvasStateTool } from './getCanvasState.tool';
import { switchDrawTool } from './switchDrawTool.tool';

export { getCanvasStateTool } from './getCanvasState.tool';
export { switchDrawTool } from './switchDrawTool.tool';

export function createDrawingAgentTools(
  getContext: AgentFrontendToolsConfig['getContext'],
): AgentFrontendToolsConfig {
  return {
    tools: [getCanvasStateTool, switchDrawTool],
    getContext,
  };
}
