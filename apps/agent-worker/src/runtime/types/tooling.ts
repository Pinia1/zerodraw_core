import type { AgentHarnessTool, Storage } from '@earendil-works/pi-agent-core';
import type { Model, MutableModels } from '@earendil-works/pi-ai';

export interface AgentToolingSnapshot {
  tools: AgentHarnessTool<any, any, any>[];
  toolsFingerprint: string;
  systemPrompt: string;
}

/** 宿主注入：模型、工具列表与 system prompt */
export interface AgentToolingCatalog {
  getModel(): Model<'openai-completions'>;
  getModels(): MutableModels;
  getTooling(): AgentToolingSnapshot;
}

export interface HarnessSessionBindings<TMeta, TToolContext extends object | undefined> {
  wrapTools?: (
    tools: AgentHarnessTool<any, any, any>[],
  ) => AgentHarnessTool<TToolContext, any, any>[];
  createToolContext: (meta: TMeta) => TToolContext;
  createStorage: (meta: TMeta) => Storage;
}
