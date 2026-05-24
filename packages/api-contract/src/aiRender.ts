import { z } from 'zod';

/** WebSocket 路径（相对 host） */
export const AI_RENDER_WS_PATH = '/render';

/** 默认端口，与 packages/ai-render/server.py 一致 */
export const AI_RENDER_DEFAULT_PORT = 8765;

export const AI_RENDER_DEFAULT_WS_URL = `ws://localhost:${AI_RENDER_DEFAULT_PORT}${AI_RENDER_WS_PATH}`;
export const AI_RENDER_DEFAULT_HTTP_URL = `http://localhost:${AI_RENDER_DEFAULT_PORT}`;

/** 协议版本，便于后续升级 */
export const AI_RENDER_PROTOCOL_VERSION = 1;

// ── Client → Server ────────────────────────────────────────────────────────────

export const aiRenderRenderRequestSchema = z.object({
  type: z.literal('render'),
  requestId: z.string().min(1),
  /** PNG data URL 或纯 base64 */
  image: z.string().min(1),
  prompt: z.string(),
  /** 0.1–0.95，越大越保留草图结构 */
  strength: z.number().min(0.1).max(0.95).optional(),
  /** 1–4，SD-Turbo 推荐 1–2 */
  steps: z.number().int().min(1).max(4).optional(),
  guidanceScale: z.number().optional(),
});

export const aiRenderPingRequestSchema = z.object({
  type: z.literal('ping'),
  requestId: z.string().optional(),
});

export const aiRenderClientMessageSchema = z.discriminatedUnion('type', [
  aiRenderRenderRequestSchema,
  aiRenderPingRequestSchema,
]);

export type AIRenderRenderRequest = z.infer<typeof aiRenderRenderRequestSchema>;
export type AIRenderPingRequest = z.infer<typeof aiRenderPingRequestSchema>;
export type AIRenderClientMessage = z.infer<typeof aiRenderClientMessageSchema>;

// ── Server → Client ────────────────────────────────────────────────────────────

export const aiRenderReadyMessageSchema = z.object({
  type: z.literal('ready'),
  protocolVersion: z.number(),
  model: z.string(),
  device: z.string(),
  gpu: z.string().nullable().optional(),
});

export const aiRenderResultMessageSchema = z.object({
  type: z.literal('render.result'),
  requestId: z.string(),
  /** PNG data URL */
  image: z.string(),
  elapsed_ms: z.number(),
});

export const aiRenderPongMessageSchema = z.object({
  type: z.literal('pong'),
  requestId: z.string().optional(),
});

export const aiRenderErrorMessageSchema = z.object({
  type: z.literal('error'),
  requestId: z.string().optional(),
  code: z.string(),
  message: z.string(),
});

export const aiRenderServerMessageSchema = z.discriminatedUnion('type', [
  aiRenderReadyMessageSchema,
  aiRenderResultMessageSchema,
  aiRenderPongMessageSchema,
  aiRenderErrorMessageSchema,
]);

export type AIRenderReadyMessage = z.infer<typeof aiRenderReadyMessageSchema>;
export type AIRenderResultMessage = z.infer<typeof aiRenderResultMessageSchema>;
export type AIRenderPongMessage = z.infer<typeof aiRenderPongMessageSchema>;
export type AIRenderErrorMessage = z.infer<typeof aiRenderErrorMessageSchema>;
export type AIRenderServerMessage = z.infer<typeof aiRenderServerMessageSchema>;

// ── HTTP /health ───────────────────────────────────────────────────────────────

export const aiRenderHealthResponseSchema = z.object({
  status: z.literal('ok'),
  protocolVersion: z.number(),
  device: z.string(),
  model: z.string(),
  cuda_available: z.boolean(),
  gpu: z.string().nullable().optional(),
});

export type AIRenderHealthResponse = z.infer<typeof aiRenderHealthResponseSchema>;
