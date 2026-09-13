import type { SessionMetadata } from '@earendil-works/pi-agent-core';

/** Agent 默认对话 lane（与 pi-agent harness.lane 名称一致）。 */
export const AGENT_MAIN_LANE = 'main';

/** 应用层会话状态（suspended = 等待 deferred 工具放行）。 */
export type AgentSessionStatus = 'active' | 'suspended' | 'closed';

/**
 * 扩展 pi-agent 会话元数据，携带归属与列表字段。
 * pi-agent 内部只关心 id/createdAt/storageVersion；其余为业务字段。
 */
export interface AgentSessionMeta extends SessionMetadata {
  userId: number;
  title: string | null;
  status: AgentSessionStatus;
}
