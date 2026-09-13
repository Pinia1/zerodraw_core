import type { AgentSessionDetail } from '@zeroDraw/api-contract';

export type AgentChatPhase = 'idle' | 'initializing' | 'streaming' | 'suspended';

export interface AgentChatState {
  sessionId: string | null;
  sessionStatus: AgentSessionDetail['status'] | null;
  phase: AgentChatPhase;
  error: string | null;
}
