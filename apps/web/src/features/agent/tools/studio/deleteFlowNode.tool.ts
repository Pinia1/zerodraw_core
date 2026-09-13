import {
  deleteFlowNodeArgsSchema,
  type DeleteFlowNodeArgs,
  type FlowMutationResult,
} from '@zeroDraw/api-contract';
import type { FrontendToolDefinition } from '@zeroDraw/agent-ui';

export const deleteFlowNodeTool: FrontendToolDefinition<DeleteFlowNodeArgs, FlowMutationResult> = {
  name: 'delete_flow_node',
  kind: 'frontend',
  capabilities: ['canvas.mutate'],
  async execute(args, ctx) {
    const parsed = deleteFlowNodeArgsSchema.parse(args);
    const result = ctx.applyFlowMutation?.({ op: 'delete_node', args: parsed });
    if (!result || typeof result !== 'object' || !('ok' in result)) {
      throw new Error('flow mutation unavailable');
    }
    return result as FlowMutationResult;
  },
};
