import type { AgentHarnessTool, Storage } from '@earendil-works/pi-agent-core';
import type { Model, MutableModels } from '@earendil-works/pi-ai';
import type { ClientToolDefinition } from '@zeroDraw/api-contract';

export interface AgentToolingSnapshot {
  tools: AgentHarnessTool<any, any, any>[];
  toolsFingerprint: string;
  systemPrompt: string;
}

export interface AgentToolingOptions {
  /** undefined = 后端默认 frontend tools；[] = 无 client tools；非空 = 动态注册 */
  clientTools?: ClientToolDefinition[] | null;
}

/** 宿主注入：模型、工具列表与 system prompt */
export interface AgentToolingCatalog {
  getModel(): Model<'anthropic-messages'>;
  getModels(): MutableModels;
  getTooling(options?: AgentToolingOptions): AgentToolingSnapshot;
}

export interface HarnessSessionBindings<TMeta, TToolContext extends object | undefined> {
  wrapTools?: (
    tools: AgentHarnessTool<any, any, any>[],
  ) => AgentHarnessTool<TToolContext, any, any>[];
  createToolContext: (meta: TMeta) => TToolContext;
  createStorage: (meta: TMeta) => Storage;
}
