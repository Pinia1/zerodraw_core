import type { FrontendToolName } from '@zeroDraw/api-contract';

/** 由 web 层注入的画布 / 应用上下文，core 不直接依赖 Konva */
export interface FrontendToolContext {
  projectId: string;
  /** 读取图层 store 快照（由调用方提供 getter，避免 core 绑定 zustand 单例） */
  getLayerState: () => {
    layers: Array<{
      id: string;
      name: string;
      visible: boolean;
      opacity: number;
      order?: number;
    }>;
  };
}

export interface FrontendToolDefinition<TArgs = unknown, TResult = unknown> {
  name: FrontendToolName;
  /** 是否需要用户手动确认后再 complete（后续扩展 approval UI） */
  requiresApproval?: boolean;
  execute: (args: TArgs, ctx: FrontendToolContext) => Promise<TResult> | TResult;
}

export interface AgentFrontendToolsConfig {
  tools: FrontendToolDefinition[];
  getContext: () => FrontendToolContext;
}
