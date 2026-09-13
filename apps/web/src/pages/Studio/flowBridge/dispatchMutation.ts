import type { FlowMutationResult } from '@zeroDraw/api-contract';
import {
  connectFlowNodes,
  createFlowNode,
  deleteFlowNode,
  updateFlowNode,
} from './applyMutation';
import type { StudioFlowMutation } from './types';
import type { StudioFlowState } from '../types';

export function dispatchStudioFlowMutation(
  state: StudioFlowState,
  mutation: StudioFlowMutation,
): { state: StudioFlowState; result: FlowMutationResult } {
  switch (mutation.op) {
    case 'create_node':
      return createFlowNode(state, mutation.args);
    case 'update_node':
      return updateFlowNode(state, mutation.args);
    case 'delete_node':
      return deleteFlowNode(state, mutation.args);
    case 'connect_nodes':
      return connectFlowNodes(state, mutation.args);
    default:
      return { state, result: { ok: false, message: '未知操作' } };
  }
}
