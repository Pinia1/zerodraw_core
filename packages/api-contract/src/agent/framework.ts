/** 工具执行位置：trusted=宿主进程，frontend=浏览器 deferred，sandbox=隔离运行时（预留） */
export const TOOL_KINDS = ['trusted', 'frontend', 'sandbox'] as const;
export type ToolKind = (typeof TOOL_KINDS)[number];

/** 宿主侧 capability（API 进程内注入） */
export const HOST_CAPABILITIES = ['project.read', 'generate.submit', 'frontend.bridge'] as const;
export type HostCapability = (typeof HOST_CAPABILITIES)[number];

/** 浏览器侧 capability（FrontendTool 声明，由 web host 实现） */
export const FRONTEND_CAPABILITIES = ['canvas.read', 'canvas.mutate', 'canvas.tools'] as const;
export type FrontendToolCapability = (typeof FRONTEND_CAPABILITIES)[number];

export type AgentCapability = HostCapability;

export interface ToolRegistrationMeta {
  kind: ToolKind;
  capabilities: readonly AgentCapability[];
}

export interface FrontendToolRegistrationMeta {
  kind: 'frontend';
  capabilities: readonly FrontendToolCapability[];
}
