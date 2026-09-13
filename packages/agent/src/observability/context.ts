import type { AgentObservabilityContext } from './types';

/** 从会话元数据构造观测上下文（session / runtime host 共用）。 */
export function toObservabilityContext(meta: {
  id: string;
  userId: number;
  projectId?: string | null;
}): AgentObservabilityContext {
  return {
    sessionId: meta.id,
    userId: meta.userId,
    projectId: meta.projectId ?? null,
  };
}
