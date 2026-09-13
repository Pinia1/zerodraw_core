import type { AgentHarness } from '@earendil-works/pi-agent-core';
import { AGENT_MAIN_LANE } from './types/session';
import { getAgentRuntimeLogger } from './types/logger';
import type { AgentSseFrame } from './sse-stream';

const HARNESS_EVENT_NAMES = [
  'message_start',
  'message_update',
  'message_end',
  'tool_start',
  'tool_update',
  'tool_end',
  'run_suspend',
  'run_end',
  'fault',
  'handler_error',
] as const;

export type HarnessEventName = (typeof HARNESS_EVENT_NAMES)[number];

function assistantText(message: unknown): string {
  const content = (message as { content?: unknown })?.content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((part): part is { type: 'text'; text: string } => {
      return (part as { type?: unknown })?.type === 'text';
    })
    .map((part) => part.text)
    .join('');
}

function toolResultText(result: unknown): string {
  const content = (result as { content?: unknown })?.content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((part): part is { type: 'text'; text: string } => {
      return (part as { type?: unknown })?.type === 'text';
    })
    .map((part) => part.text)
    .join('');
}

function inMainLane(event: { lane?: string }): boolean {
  return event.lane === undefined || event.lane === AGENT_MAIN_LANE;
}

export interface HarnessEventHandlers {
  onFault?: () => void;
}

export function mapHarnessEventToSseFrame(
  eventName: string,
  payload: Record<string, unknown>,
  sessionId: string,
  handlers?: HarnessEventHandlers,
): AgentSseFrame | null {
  const logger = getAgentRuntimeLogger();

  switch (eventName) {
    case 'message_start': {
      if (!inMainLane(payload)) return null;
      if ((payload.message as { role?: string })?.role !== 'assistant') return null;
      return { type: 'message_start' };
    }
    case 'message_update': {
      if (!inMainLane(payload)) return null;
      if ((payload.message as { role?: string })?.role !== 'assistant') return null;
      const evt = payload.event as { type?: string; delta?: string };
      if (evt?.type === 'text_delta') {
        logger.debug('[Agent LLM] delta', { sessionId, delta: evt.delta });
        return { type: 'delta', text: evt.delta };
      }
      return null;
    }
    case 'message_end': {
      if (!inMainLane(payload)) return null;
      const msg = payload.message as { role?: string; stopReason?: string };
      if (msg.role !== 'assistant') return null;
      if (msg.stopReason && msg.stopReason !== 'stop') return null;
      const text = assistantText(payload.message);
      if (!text) return null;
      logger.info('[Agent LLM] assistant message', {
        sessionId,
        stopReason: msg.stopReason,
        text,
      });
      return { type: 'message', text };
    }
    case 'tool_start':
      if (!inMainLane(payload)) return null;
      return {
        type: 'tool_start',
        toolCallId: payload.toolCallId,
        toolName: payload.toolName,
        args: payload.args,
      };
    case 'tool_update':
      if (!inMainLane(payload)) return null;
      return {
        type: 'tool_update',
        toolCallId: payload.toolCallId,
        toolName: payload.toolName,
        text: toolResultText(payload.partialResult),
      };
    case 'tool_end':
      if (!inMainLane(payload)) return null;
      return {
        type: 'tool_end',
        toolCallId: payload.toolCallId,
        toolName: payload.toolName,
        isError: payload.isError,
        text: toolResultText(payload.result),
      };
    case 'run_suspend':
      if (!inMainLane(payload)) return null;
      return { type: 'suspended', runId: payload.runId, poll: payload.poll };
    case 'run_end':
      if (!inMainLane(payload)) return null;
      logger.info('[Agent LLM] run_end', {
        sessionId,
        runId: payload.runId,
        status: payload.status,
      });
      return { type: 'done', runId: payload.runId, status: payload.status };
    case 'fault':
      logger.error('[Agent LLM] fault', undefined, {
        sessionId,
        message: payload.message,
        code: payload.code,
      });
      handlers?.onFault?.();
      return { type: 'error', message: payload.message };
    case 'handler_error':
      logger.error('[Agent LLM] handler_error', undefined, {
        sessionId,
        error: payload.error,
      });
      return { type: 'error', message: payload.error };
    default:
      return null;
  }
}

/** 将 harness 事件转发到任意 sink（SSE / worker IPC） */
export function attachHarnessEventForwarder<TContext extends object | undefined>(
  harness: AgentHarness<TContext>,
  forward: (eventName: HarnessEventName, payload: Record<string, unknown>) => void,
  onFault?: () => void,
): Array<() => void> {
  return HARNESS_EVENT_NAMES.map((eventName) =>
    harness.events.on(eventName, (payload) => {
      if (eventName === 'fault') onFault?.();
      forward(eventName, payload as Record<string, unknown>);
    }),
  );
}

export function subscribeHarnessEventsToSse<TContext extends object | undefined>(
  harness: AgentHarness<TContext>,
  sessionId: string,
  send: (frame: AgentSseFrame) => void,
  markSuspended: (sessionId: string) => void | Promise<void>,
  markActive: (sessionId: string) => void | Promise<void>,
  onFault?: () => void,
): Array<() => void> {
  return attachHarnessEventForwarder(
    harness,
    (eventName, payload) => {
      const frame = mapHarnessEventToSseFrame(eventName, payload, sessionId, { onFault });
      if (!frame) return;
      if (frame.type === 'suspended') void markSuspended(sessionId);
      if (frame.type === 'done' && frame.status !== 'failed') void markActive(sessionId);
      send(frame);
    },
    onFault,
  );
}
