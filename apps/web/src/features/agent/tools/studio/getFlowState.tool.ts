import {
  getFlowStateArgsSchema,
  type GetFlowStateArgs,
  type GetFlowStateResult,
} from '@zeroDraw/api-contract';
import type { FrontendToolDefinition } from '@zeroDraw/core';
import { summarizeStudioNode } from '@/pages/Studio/flowBridge/summarizeNode';
import type { StudioFlowState } from '@/pages/Studio/types';

export const getFlowStateTool: FrontendToolDefinition<GetFlowStateArgs, GetFlowStateResult> = {
  name: 'get_flow_state',
  kind: 'frontend',
  capabilities: ['canvas.read'],
  async execute(args, ctx) {
    const { nodeIds, includeContent = true } = getFlowStateArgsSchema.parse(args ?? {});
    const state = ctx.getFlowState?.() as StudioFlowState | undefined;
    if (!state) {
      throw new Error('flow state unavailable');
    }

    const idSet = nodeIds?.length ? new Set(nodeIds) : null;
    const nodes = state.nodes
      .filter((node) => !idSet || idSet.has(node.id))
      .map((node) => summarizeStudioNode(node, includeContent));

    return {
      projectId: ctx.projectId || null,
      nodeCount: state.nodes.length,
      edgeCount: state.edges.length,
      viewport: state.viewport,
      nodes,
      edges: state.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
    };
  },
};
