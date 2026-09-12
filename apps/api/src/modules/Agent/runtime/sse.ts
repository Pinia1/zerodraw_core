import {
  BACKGROUND_CONTEXT,
  withAbortSignal,
  type AgentHarness,
  type AgentLane,
  type Context,
} from '@earendil-works/pi-agent-core';
import type { ImageContent } from '@earendil-works/pi-ai';
import type { ServerResponse } from 'http';
import { logger } from '../../../utils/logger';
import { AGENT_MAIN_LANE, type AgentToolContext } from '../session/types';
import { agentRegister } from './register';
import { releaseLaneIfBusy } from './lane-idle';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const;

/** hijack 后 @fastify/cors 不会自动加头，需手动回显 Origin（与 app.ts cors 配置一致）。 */
function corsHeadersForHijack(origin?: string): Record<string, string> {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

const KEEPALIVE_MS = 15_000;

export type AgentSseFrame = Record<string, unknown>;

export interface AgentPromptStreamOptions {
  sessionId: string;
  harness: AgentHarness<AgentToolContext>;
  lane: AgentLane;
  message: string;
  images?: ImageContent[];
  raw: ServerResponse;
  /** 浏览器请求的 Origin，hijack SSE 时必须手动写入 CORS 头 */
  corsOrigin?: string;
  markSuspended: (sessionId: string) => void | Promise<void>;
  markActive: (sessionId: string) => void | Promise<void>;
}

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

function writeSseFrame(raw: ServerResponse, frame: AgentSseFrame): void {
  raw.write(`data: ${JSON.stringify(frame)}\n\n`);
}

function subscribeHarnessEvents(
  harness: AgentHarness<AgentToolContext>,
  sessionId: string,
  send: (frame: AgentSseFrame) => void,
  markSuspended: AgentPromptStreamOptions['markSuspended'],
  markActive: AgentPromptStreamOptions['markActive'],
): Array<() => void> {
  return [
    harness.events.on('message_start', (e) => {
      if (!inMainLane(e)) return;
      if ((e.message as { role?: string })?.role !== 'assistant') return;
      send({ type: 'message_start' });
    }),
    harness.events.on('message_update', (e) => {
      if (!inMainLane(e)) return;
      if ((e.message as { role?: string })?.role !== 'assistant') return;
      if (e.event.type === 'text_delta') {
        logger.debug('[Agent LLM] delta', { sessionId, delta: e.event.delta });
        send({ type: 'delta', text: e.event.delta });
      }
    }),
    harness.events.on('message_end', (e) => {
      if (!inMainLane(e)) return;
      const msg = e.message as { role?: string; stopReason?: string; usage?: unknown };
      if (msg.role !== 'assistant') return;
      const text = assistantText(e.message);
      // 流式过程中会有多次 message_end（stopReason 非 stop），只推送最终完整回复
      if (msg.stopReason && msg.stopReason !== 'stop') return;
      if (text) {
        logger.info('[Agent LLM] assistant message', {
          sessionId,
          stopReason: msg.stopReason,
          text,
        });
        send({ type: 'message', text });
      }
    }),
    harness.events.on('tool_start', (e) => {
      if (!inMainLane(e)) return;
      send({ type: 'tool_start', toolCallId: e.toolCallId, toolName: e.toolName, args: e.args });
    }),
    harness.events.on('tool_update', (e) => {
      if (!inMainLane(e)) return;
      send({
        type: 'tool_update',
        toolCallId: e.toolCallId,
        toolName: e.toolName,
        text: toolResultText(e.partialResult),
      });
    }),
    harness.events.on('tool_end', (e) => {
      if (!inMainLane(e)) return;
      send({
        type: 'tool_end',
        toolCallId: e.toolCallId,
        toolName: e.toolName,
        isError: e.isError,
        text: toolResultText(e.result),
      });
    }),
    harness.events.on('run_suspend', (e) => {
      if (!inMainLane(e)) return;
      void markSuspended(sessionId);
      send({ type: 'suspended', runId: e.runId, poll: e.poll });
    }),
    harness.events.on('run_end', (e) => {
      if (!inMainLane(e)) return;
      if (e.status !== 'failed') void markActive(sessionId);
      logger.info('[Agent LLM] run_end', { sessionId, runId: e.runId, status: e.status });
      send({ type: 'done', runId: e.runId, status: e.status });
    }),
    harness.events.on('fault', (e) => {
      logger.error('[Agent LLM] fault', undefined, { sessionId, message: e.message, code: e.code });
      agentRegister.evict(sessionId);
      send({ type: 'error', message: e.message });
    }),
    harness.events.on('handler_error', (e) => {
      logger.error('[Agent LLM] handler_error', undefined, { sessionId, error: e.error });
      send({ type: 'error', message: e.error });
    }),
  ];
}

/** 执行 prompt 并将 harness 事件流式写入 SSE 响应。 */
export async function streamAgentPrompt({
  sessionId,
  harness,
  lane,
  message,
  images,
  raw,
  corsOrigin,
  markSuspended,
  markActive,
}: AgentPromptStreamOptions): Promise<void> {
  raw.writeHead(200, { ...corsHeadersForHijack(corsOrigin), ...SSE_HEADERS });

  const send = (frame: AgentSseFrame) => writeSseFrame(raw, frame);
  send({ type: 'started' });
  const controller = new AbortController();
  const context: Context = withAbortSignal(controller.signal, BACKGROUND_CONTEXT);
  const unsubscribe = subscribeHarnessEvents(harness, sessionId, send, markSuspended, markActive);

  const keepalive = setInterval(() => raw.write(': keepalive\n\n'), KEEPALIVE_MS);
  let finished = false;

  const cleanup = () => {
    clearInterval(keepalive);
    controller.abort();
    for (const stop of unsubscribe) stop();
  };

  const onClientClose = () => {
    cleanup();
    if (finished) return;
    void releaseLaneIfBusy(lane, context).catch(() => undefined);
  };
  raw.on('close', onClientClose);

  logger.info('[Agent LLM] prompt', { sessionId, message, imageCount: images?.length ?? 0 });

  try {
    await releaseLaneIfBusy(lane, context);
    const result = await lane.prompt(message, images, context);
    if (!result.ok) {
      const errText = String(result.error);
      if (errText.includes('LaneBusy')) {
        await releaseLaneIfBusy(lane, context);
        const retry = await lane.prompt(message, images, context);
        if (!retry.ok) {
          send({ type: 'error', message: String(retry.error) });
        } else if (retry.value.status === 'suspended') {
          await markSuspended(sessionId);
          send({ type: 'suspended', operationId: retry.value.operationId });
        }
        return;
      }
      send({ type: 'error', message: errText });
    } else if (result.value.status === 'suspended') {
      await markSuspended(sessionId);
      send({ type: 'suspended', operationId: result.value.operationId });
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'HarnessFault') {
      logger.error('[Agent LLM] prompt fault', (error as Error & { cause?: unknown }).cause as Error | undefined, {
        sessionId,
        message: error.message,
      });
      agentRegister.evict(sessionId);
    }
    send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  } finally {
    finished = true;
    raw.removeListener('close', onClientClose);
    cleanup();
    raw.end();
  }
}
