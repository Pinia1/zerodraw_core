import {
  AI_RENDER_DEFAULT_WS_URL,
  aiRenderClientMessageSchema,
  aiRenderServerMessageSchema,
  type AIRenderErrorMessage,
  type AIRenderReadyMessage,
  type AIRenderRenderRequest,
  type AIRenderResultMessage,
} from '@zeroDraw/api-contract';
import { generateUUID } from '../utils/drawing';

export type AIRenderConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'ready'
  | 'rendering'
  | 'error';

export interface AIRenderClientOptions {
  /** 默认 ws://localhost:8765/render，可用 VITE_AI_RENDER_WS_URL 覆盖 */
  url?: string;
  /** 发送帧节流 ms */
  throttleMs?: number;
  onStatusChange?: (status: AIRenderConnectionStatus) => void;
  onReady?: (info: AIRenderReadyMessage) => void;
  onResult?: (result: AIRenderResultMessage) => void;
  onError?: (error: AIRenderErrorMessage) => void;
}

export interface AIRenderFrameInput {
  /** PNG data URL 或 canvas/stage */
  image: string | HTMLCanvasElement | { toDataURL: () => string };
  prompt: string;
  strength?: number;
  steps?: number;
  guidanceScale?: number;
}

const getDefaultWsUrl = () =>
  // @ts-expect-error vite inject
  (import.meta.env?.VITE_AI_RENDER_WS_URL as string | undefined) || AI_RENDER_DEFAULT_WS_URL;

function toDataUrl(image: AIRenderFrameInput['image']): string {
  if (typeof image === 'string') return image;
  return image.toDataURL();
}

/**
 * 本地 AI 渲染 WebSocket 客户端（无 React 依赖）
 * 协议：packages/api-contract/src/aiRender.ts
 */
export class AIRenderClient {
  private ws: WebSocket | null = null;
  private status: AIRenderConnectionStatus = 'disconnected';
  private readonly options: Required<Pick<AIRenderClientOptions, 'url' | 'throttleMs'>> &
    Omit<AIRenderClientOptions, 'url' | 'throttleMs'>;

  private lastSendAt = 0;
  private pendingFrame: AIRenderFrameInput | null = null;
  private isRendering = false;

  constructor(options: AIRenderClientOptions = {}) {
    this.options = {
      url: options.url ?? getDefaultWsUrl(),
      throttleMs: options.throttleMs ?? 100,
      onStatusChange: options.onStatusChange,
      onReady: options.onReady,
      onResult: options.onResult,
      onError: options.onError,
    };
  }

  getStatus() {
    return this.status;
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.setStatus('connecting');
    const ws = new WebSocket(this.options.url);
    this.ws = ws;

    ws.onopen = () => {
      // 等待服务端 ready 消息后再置为 ready
    };

    ws.onmessage = (event) => {
      let data: unknown;
      try {
        data = JSON.parse(event.data as string);
      } catch {
        this.options.onError?.({
          type: 'error',
          code: 'invalid_json',
          message: 'Invalid JSON from server',
        });
        return;
      }

      const parsed = aiRenderServerMessageSchema.safeParse(data);
      if (!parsed.success) {
        this.options.onError?.({
          type: 'error',
          code: 'invalid_message',
          message: parsed.error.message,
        });
        return;
      }

      const msg = parsed.data;
      switch (msg.type) {
        case 'ready':
          this.setStatus('ready');
          this.options.onReady?.(msg);
          break;
        case 'render.result':
          this.isRendering = false;
          this.setStatus('ready');
          this.options.onResult?.(msg);
          this.flushPendingFrame();
          break;
        case 'pong':
          break;
        case 'error':
          this.isRendering = false;
          this.setStatus('ready');
          this.options.onError?.(msg);
          this.flushPendingFrame();
          break;
      }
    };

    ws.onerror = () => {
      this.setStatus('error');
      this.options.onError?.({
        type: 'error',
        code: 'connection_failed',
        message: 'WebSocket connection failed',
      });
    };

    ws.onclose = () => {
      this.ws = null;
      this.isRendering = false;
      this.setStatus('disconnected');
    };
  }

  disconnect() {
    this.pendingFrame = null;
    this.isRendering = false;
    this.ws?.close();
    this.ws = null;
    this.setStatus('disconnected');
  }

  ping(requestId?: string) {
    this.send({ type: 'ping', requestId });
  }

  /** 发送一帧草图；内置节流，推理中会缓存最新帧 */
  sendFrame(input: AIRenderFrameInput) {
    if (!this.isConnected()) return;

    const now = Date.now();
    if (this.isRendering || now - this.lastSendAt < this.options.throttleMs) {
      this.pendingFrame = input;
      return;
    }

    this.doSendFrame(input);
  }

  private flushPendingFrame() {
    if (!this.pendingFrame || !this.isConnected()) return;
    const frame = this.pendingFrame;
    this.pendingFrame = null;
    this.doSendFrame(frame);
  }

  private doSendFrame(input: AIRenderFrameInput) {
    const payload: AIRenderRenderRequest = {
      type: 'render',
      requestId: generateUUID(),
      image: toDataUrl(input.image),
      prompt: input.prompt,
      strength: input.strength,
      steps: input.steps,
      guidanceScale: input.guidanceScale,
    };

    const parsed = aiRenderClientMessageSchema.safeParse(payload);
    if (!parsed.success) {
      this.options.onError?.({
        type: 'error',
        code: 'invalid_message',
        message: parsed.error.message,
      });
      return;
    }

    this.isRendering = true;
    this.setStatus('rendering');
    this.lastSendAt = Date.now();
    this.ws!.send(JSON.stringify(parsed.data));
  }

  private send(message: { type: 'ping'; requestId?: string }) {
    if (!this.isConnected()) return;
    this.ws!.send(JSON.stringify(message));
  }

  private setStatus(status: AIRenderConnectionStatus) {
    this.status = status;
    this.options.onStatusChange?.(status);
  }
}

export { AI_RENDER_DEFAULT_WS_URL, AI_RENDER_DEFAULT_HTTP_URL } from '@zeroDraw/api-contract';
