import type {
  ConnectFlowNodesArgs,
  CreateFlowNodeArgs,
  DeleteFlowNodeArgs,
  UpdateFlowNodeArgs,
} from '@zeroDraw/api-contract';

export type StudioFlowMutation =
  | { op: 'create_node'; args: CreateFlowNodeArgs }
  | { op: 'update_node'; args: UpdateFlowNodeArgs }
  | { op: 'delete_node'; args: DeleteFlowNodeArgs }
  | { op: 'connect_nodes'; args: ConnectFlowNodesArgs };
