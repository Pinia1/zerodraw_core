import {
  updateFlowNodeArgsSchema,
  type FlowMutationResult,
  type UpdateFlowNodeArgs,
} from '@zeroDraw/api-contract';
import type { FrontendToolDefinition } from '@zeroDraw/core';

export const updateFlowNodeTool: FrontendToolDefinition<UpdateFlowNodeArgs, FlowMutationResult> = {
  name: 'update_flow_node',
  kind: 'frontend',
  capabilities: ['canvas.mutate'],
  async execute(args, ctx) {
    const parsed = updateFlowNodeArgsSchema.parse(args);
    const result = ctx.applyFlowMutation?.({ op: 'update_node', args: parsed });
    if (!result || typeof result !== 'object' || !('ok' in result)) {
      throw new Error('flow mutation unavailable');
    }
    return result as FlowMutationResult;
  },
};
