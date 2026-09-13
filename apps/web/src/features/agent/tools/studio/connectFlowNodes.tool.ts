import {
  connectFlowNodesArgsSchema,
  type ConnectFlowNodesArgs,
  type FlowMutationResult,
} from '@zeroDraw/api-contract';
import type { FrontendToolDefinition } from '@zeroDraw/agent-ui';

export const connectFlowNodesTool: FrontendToolDefinition<
  ConnectFlowNodesArgs,
  FlowMutationResult
> = {
  name: 'connect_flow_nodes',
  kind: 'frontend',
  capabilities: ['canvas.mutate'],
  async execute(args, ctx) {
    const parsed = connectFlowNodesArgsSchema.parse(args);
    const result = ctx.applyFlowMutation?.({ op: 'connect_nodes', args: parsed });
    if (!result || typeof result !== 'object' || !('ok' in result)) {
      throw new Error('flow mutation unavailable');
    }
    return result as FlowMutationResult;
  },
};
