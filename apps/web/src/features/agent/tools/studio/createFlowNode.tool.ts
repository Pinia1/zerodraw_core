import {
  createFlowNodeArgsSchema,
  type CreateFlowNodeArgs,
  type FlowMutationResult,
} from '@zeroDraw/api-contract';
import type { FrontendToolDefinition } from '@zeroDraw/agent-ui';

export const createFlowNodeTool: FrontendToolDefinition<CreateFlowNodeArgs, FlowMutationResult> = {
  name: 'create_flow_node',
  kind: 'frontend',
  capabilities: ['canvas.mutate'],
  async execute(args, ctx) {
    const parsed = createFlowNodeArgsSchema.parse(args);
    const result = ctx.applyFlowMutation?.({ op: 'create_node', args: parsed });
    if (!result || typeof result !== 'object' || !('ok' in result)) {
      throw new Error('flow mutation unavailable');
    }
    return result as FlowMutationResult;
  },
};
