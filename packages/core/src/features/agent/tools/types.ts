import type { FrontendToolCapability } from '@zeroDraw/api-contract';

export interface FlowStateSnapshot {
  nodes: Array<{ id: string; type?: string; position: { x: number; y: number } }>;
  edges: Array<{ id: string; source: string; target: string }>;
  viewport: { x: number; y: number; zoom: number };
}

/** 由 web 层注入的画布 / 应用上下文，core 不直接依赖 Konva / React Flow */
export interface FrontendToolContext {
  projectId: string;
  /** Drawing 页：读取图层 store 快照 */
  getLayerState?: () => {
    layers: Array<{
      id: string;
      name: string;
      visible: boolean;
      opacity: number;
      order?: number;
    }>;
  };
  /** Studio 页：读取 React Flow 快照 */
  getFlowState?: () => FlowStateSnapshot;
  /** Studio 页：执行画布变更（create / update / delete node、连线等） */
  applyFlowMutation?: (mutation: unknown) => unknown;
}

export interface FrontendToolDefinition<TArgs = unknown, TResult = unknown> {
  name: string;
  kind: 'frontend';
  capabilities: FrontendToolCapability[];
  /** 是否需要用户手动确认后再 complete（后续扩展 approval UI） */
  requiresApproval?: boolean;
  execute: (args: TArgs, ctx: FrontendToolContext) => Promise<TResult> | TResult;
}

export interface AgentFrontendToolsConfig {
  tools: FrontendToolDefinition[];
  getContext: () => FrontendToolContext;
}
