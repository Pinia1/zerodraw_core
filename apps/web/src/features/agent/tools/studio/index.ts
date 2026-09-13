import type { AgentFrontendToolsConfig, FrontendToolDefinition } from '@zeroDraw/core';
import { connectFlowNodesTool } from './connectFlowNodes.tool';
import { createFlowNodeTool } from './createFlowNode.tool';
import { deleteFlowNodeTool } from './deleteFlowNode.tool';
import { getFlowStateTool } from './getFlowState.tool';
import { updateFlowNodeTool } from './updateFlowNode.tool';

export { getFlowStateTool } from './getFlowState.tool';
export { studioClientToolDefinitions } from './clientDefinitions';

export function createStudioAgentTools(
  getContext: AgentFrontendToolsConfig['getContext'],
): AgentFrontendToolsConfig {
  return {
    tools: [
      getFlowStateTool,
      createFlowNodeTool,
      updateFlowNodeTool,
      deleteFlowNodeTool,
      connectFlowNodesTool,
    ] as FrontendToolDefinition[],
    getContext,
  };
}
