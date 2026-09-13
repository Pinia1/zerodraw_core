import type { ServerResponse } from 'http';

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const;

export const KEEPALIVE_MS = 15_000;

/** 部分反向代理会缓冲 SSE，直到达到 ~2KB 才转发；先发 padding 注释强制立即 flush */
const PROXY_BUFFER_PADDING = 2048;

export type AgentSseFrame = Record<string, unknown>;

type FlushableResponse = ServerResponse & { flush?: () => void };

export function corsHeadersForHijack(origin?: string): Record<string, string> {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

function flushSseResponse(raw: ServerResponse): void {
  const res = raw as FlushableResponse;
  if (typeof res.flush === 'function') {
    res.flush();
  }
}

export function prepareSseResponse(raw: ServerResponse, corsOrigin?: string): void {
  raw.socket?.setNoDelay(true);
  raw.writeHead(200, { ...corsHeadersForHijack(corsOrigin), ...SSE_HEADERS });
  raw.write(`:${' '.repeat(PROXY_BUFFER_PADDING)}\n\n`);
  flushSseResponse(raw);
}

export function writeSseFrame(raw: ServerResponse, frame: AgentSseFrame): void {
  if (raw.writableEnded || raw.destroyed) return;
  raw.write(`data: ${JSON.stringify(frame)}\n\n`);
  flushSseResponse(raw);
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
  prepareSseResponse(raw, corsOrigin);

  const send = (frame: AgentSseFrame) => writeSseFrame(raw, frame);
  send({ type: 'started' });

  const controller = new AbortController();
  const onClose = () => controller.abort();
  raw.on('close', onClose);

  const keepalive = setInterval(() => {
    if (raw.writableEnded || raw.destroyed) return;
    raw.write(': keepalive\n\n');
    flushSseResponse(raw);
  }, KEEPALIVE_MS);

  try {
    await run({ send, abortSignal: controller.signal });
  } finally {
    raw.off('close', onClose);
    clearInterval(keepalive);
    controller.abort();
    if (!raw.writableEnded) raw.end();
  }
}
