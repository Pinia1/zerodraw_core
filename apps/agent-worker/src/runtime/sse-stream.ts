import type { ServerResponse } from 'http';

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const;

export const KEEPALIVE_MS = 15_000;

export type AgentSseFrame = Record<string, unknown>;

export function corsHeadersForHijack(origin?: string): Record<string, string> {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

export function writeSseFrame(raw: ServerResponse, frame: AgentSseFrame): void {
  raw.write(`data: ${JSON.stringify(frame)}\n\n`);
}

export interface AgentSseStreamContext {
  send: (frame: AgentSseFrame) => void;
  abortSignal: AbortSignal;
}

/** 统一 SSE 连接生命周期：headers、keepalive、started、cleanup */
export async function withAgentSseStream(
  raw: ServerResponse,
  corsOrigin: string | undefined,
  run: (ctx: AgentSseStreamContext) => Promise<void>,
): Promise<void> {
  raw.writeHead(200, { ...corsHeadersForHijack(corsOrigin), ...SSE_HEADERS });

  const send = (frame: AgentSseFrame) => writeSseFrame(raw, frame);
  send({ type: 'started' });

  const controller = new AbortController();
  const keepalive = setInterval(() => raw.write(': keepalive\n\n'), KEEPALIVE_MS);

  try {
    await run({ send, abortSignal: controller.signal });
  } finally {
    clearInterval(keepalive);
    controller.abort();
    raw.end();
  }
}
