import type { ImageContent } from '@earendil-works/pi-ai';
import type { AgentResumeParams, AgentResumeResponse } from '@zeroDraw/api-contract';
import type { AgentSessionMeta } from '../runtime/types/session';
import type { AgentSseFrame } from '../runtime/sse-stream';

export type WorkerParentMessage =
  | { type: 'shutdown' }
  | { type: 'close_session'; requestId: string; sessionId: string }
  | { type: 'prompt'; requestId: string; meta: AgentSessionMeta; message: string; images?: ImageContent[] }
  | {
      type: 'resume';
      requestId: string;
      meta: AgentSessionMeta;
      input: AgentResumeParams;
    }
  | {
      type: 'tool_result';
      requestId: string;
      ok: boolean;
      result?: unknown;
      error?: string;
    };

export type WorkerChildMessage =
  | { type: 'ready' }
  | { type: 'worker_error'; message: string }
  | { type: 'close_session_result'; requestId: string; ok: boolean; error?: string }
  | { type: 'prompt_event'; requestId: string; event: string; payload: Record<string, unknown> }
  | {
      type: 'prompt_finished';
      requestId: string;
      ok: boolean;
      suspended?: boolean;
      operationId?: string;
      error?: string;
    }
  | { type: 'resume_result'; requestId: string; ok: boolean; result?: AgentResumeResponse; error?: string }
  | {
      type: 'tool_execute';
      requestId: string;
      sessionId: string;
      userId: number;
      toolName: string;
      toolCallId: string;
      params: unknown;
    };

export function isWorkerChildMessage(value: unknown): value is WorkerChildMessage {
  return typeof value === 'object' && value !== null && 'type' in value;
}

export type { AgentSseFrame };
