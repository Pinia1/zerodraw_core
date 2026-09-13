import type { Context } from '@earendil-works/pi-agent-core';
import type { ImageContent } from '@earendil-works/pi-ai';
import type { AgentPromptRunStatus, AgentResumeParams, AgentResumeResponse } from '@zeroDraw/api-contract';
import type { AgentSessionMeta, AgentSseStreamContext } from '@zeroDraw/agent-worker/runtime';
import type { ServerResponse } from 'http';

export type { AgentSessionMeta };

export type AgentRuntimeHostMode = 'inprocess' | 'worker';

export interface AgentPromptFinishedResult {
  status: AgentPromptRunStatus;
  errorMessage?: string | null;
}

export interface AgentStreamPromptOptions {
  sessionId: string;
  meta: AgentSessionMeta;
  message: string;
  images?: ImageContent[];
  raw?: ServerResponse;
  corsOrigin?: string;
  /** 路由层已开启 SSE 时传入，避免 prompt 锁等待期间无法推送帧 */
  sse?: AgentSseStreamContext;
  markSuspended: (sessionId: string) => void | Promise<void>;
  markActive: (sessionId: string) => void | Promise<void>;
  onFinished?: (result: AgentPromptFinishedResult) => void | Promise<void>;
}

export interface AgentRuntimeHost {
  readonly mode: AgentRuntimeHostMode;
  streamPrompt(options: AgentStreamPromptOptions): Promise<void>;
  resumeSession(
    sessionId: string,
    meta: AgentSessionMeta,
    input: AgentResumeParams,
    context: Context,
  ): Promise<AgentResumeResponse>;
  closeSession(sessionId: string, context: Context): Promise<void>;
  closeAll(context: Context): Promise<void>;
  evict(sessionId: string): void;
}
