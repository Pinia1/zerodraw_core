import type {
  ConnectFlowNodesArgs,
  CreateFlowNodeArgs,
  DeleteFlowNodeArgs,
  FlowMutationResult,
  UpdateFlowNodeArgs,
} from '@zeroDraw/api-contract';
import { generateUUID } from '@zeroDraw/agent-ui';
import type { Edge } from '@xyflow/react';
import type { StudioFlowState } from '../types';

const DEFAULTS = {
  markdown: { width: 300, height: 220, label: '脚本' },
  img: { width: 220, height: 220, label: '参考图' },
  video: { width: 320, height: 180, label: '视频', status: 'empty' as const },
};

function fail(message: string): FlowMutationResult {
  return { ok: false, message };
}

function ok(partial: Omit<FlowMutationResult, 'ok'> = {}): FlowMutationResult {
  return { ok: true, ...partial };
}

function findNode(state: StudioFlowState, id: string): StudioNode | undefined {
  return state.nodes.find((n) => n.id === id);
}

export function createFlowNode(
  state: StudioFlowState,
  args: CreateFlowNodeArgs,
): { state: StudioFlowState; result: FlowMutationResult } {
  const id = args.id ?? generateUUID();
  if (findNode(state, id)) {
    return { state, result: fail(`节点已存在: ${id}`) };
  }

  const defaults = DEFAULTS[args.type];
  const width = args.width ?? defaults.width;
  const height = args.height ?? defaults.height;
  const label = args.label ?? defaults.label;
  const position = args.position ?? { x: 0, y: 0 };

  let node: StudioNode;

  switch (args.type) {
    case 'markdown':
      node = {
        id,
        type: 'markdown',
        position,
        data: { label, width, height, content: args.content ?? '', status: 'empty' },
      };
      break;
    case 'img':
      node = {
        id,
        type: 'img',
        position,
        data: { label, width, height, src: args.src },
      };
      break;
    case 'video':
      node = {
        id,
        type: 'video',
        position,
        data: {
          label,
          width,
          height,
          status: args.status ?? DEFAULTS.video.status,
          src: args.src,
        },
      };
      break;
    default:
      return { state, result: fail(`未知节点类型: ${args.type}`) };
  }

  return {
    state: { ...state, nodes: [...state.nodes, node] },
    result: ok({ nodeId: id, message: `已创建 ${args.type} 节点 ${id}` }),
  };
}

export function updateFlowNode(
  state: StudioFlowState,
  args: UpdateFlowNodeArgs,
): { state: StudioFlowState; result: FlowMutationResult } {
  const index = state.nodes.findIndex((n) => n.id === args.id);
  if (index < 0) {
    return { state, result: fail(`节点不存在: ${args.id}`) };
  }

  const current = state.nodes[index];
  const data = { ...current.data } as Record<string, unknown>;

  if (args.label !== undefined) data.label = args.label;
  if (args.content !== undefined && current.type === 'markdown') data.content = args.content;
  if (args.src !== undefined && (current.type === 'img' || current.type === 'video')) {
    data.src = args.src;
  }
  if (args.width !== undefined) data.width = args.width;
  if (args.height !== undefined) data.height = args.height;
  if (args.status !== undefined && current.type === 'video') data.status = args.status;
  if (args.error !== undefined && current.type === 'video') data.error = args.error;

  const updated = {
    ...current,
    position: args.position ?? current.position,
    data,
  } as StudioNode;

  const nodes = [...state.nodes];
  nodes[index] = updated;

  return {
    state: { ...state, nodes },
    result: ok({ nodeId: args.id, message: `已更新节点 ${args.id}` }),
  };
}

export function deleteFlowNode(
  state: StudioFlowState,
  args: DeleteFlowNodeArgs,
): { state: StudioFlowState; result: FlowMutationResult } {
  if (!findNode(state, args.id)) {
    return { state, result: fail(`节点不存在: ${args.id}`) };
  }

  const nodes = state.nodes.filter((n) => n.id !== args.id);
  const edges = state.edges.filter((e) => e.source !== args.id && e.target !== args.id);

  return {
    state: { ...state, nodes, edges },
    result: ok({ nodeId: args.id, message: `已删除节点 ${args.id}` }),
  };
}

export function connectFlowNodes(
  state: StudioFlowState,
  args: ConnectFlowNodesArgs,
): { state: StudioFlowState; result: FlowMutationResult } {
  if (!findNode(state, args.source)) {
    return { state, result: fail(`源节点不存在: ${args.source}`) };
  }
  if (!findNode(state, args.target)) {
    return { state, result: fail(`目标节点不存在: ${args.target}`) };
  }
  if (args.source === args.target) {
    return { state, result: fail('不能连接同一节点') };
  }

  const edgeId = args.id ?? `e-${args.source}-${args.target}`;
  if (state.edges.some((e) => e.id === edgeId)) {
    return { state, result: fail(`连线已存在: ${edgeId}`) };
  }

  const edge: Edge = {
    id: edgeId,
    source: args.source,
    target: args.target,
    animated: false,
  };

  return {
    state: { ...state, edges: [...state.edges, edge] },
    result: ok({ edgeId, message: `已连接 ${args.source} → ${args.target}` }),
  };
}
