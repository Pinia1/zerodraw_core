import type {
  AgentCreateSessionParams,
  AgentFrontendToolCompleteParams,
  AgentFrontendToolCompleteResponse,
  AgentPromptParams,
  AgentResumeParams,
  AgentResumeResponse,
  AgentSessionDetail,
  AgentSseFrame,
} from '@zeroDraw/api-contract';
import request from '.';

export interface AgentSessionSummary {
  id: string;
  title: string | null;
  status: 'active' | 'suspended' | 'closed';
  createdAt: number;
}

export type { AgentSseFrame };

const getApiBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL) {
    return (import.meta as ImportMeta & { env?: Record<string, string> }).env!.VITE_API_URL!;
  }
  if (typeof process !== 'undefined' && process.env?.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }
  return '';
};

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

export const httpCreateAgentSession = (
  data?: AgentCreateSessionParams,
): Promise<AgentSessionSummary> => {
  return request.post('/api/agent', data ?? {});
};

export const httpGetAgentSession = (id: string): Promise<AgentSessionDetail> => {
  return request.get(`/api/agent/${id}`);
};

export const httpAgentResume = (
  id: string,
  data: AgentResumeParams,
): Promise<AgentResumeResponse> => {
  return request.post(`/api/agent/${id}/resume`, data);
};

export const httpCompleteFrontendTool = (
  id: string,
  data: AgentFrontendToolCompleteParams,
): Promise<AgentFrontendToolCompleteResponse> => {
  return request.post(`/api/agent/${id}/frontend-tools/complete`, data);
};

/** 解析 SSE 文本块 */
export function parseSseChunk(chunk: string, onFrame: (frame: AgentSseFrame) => void): void {
  for (const block of chunk.split('\n\n')) {
    for (const line of block.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload) continue;
      try {
        onFrame(JSON.parse(payload) as AgentSseFrame);
      } catch {
        // 忽略 malformed 帧
      }
    }
  }
}

/** POST prompt 并消费 SSE 流（需 Bearer token，不能用 EventSource）。 */
export async function streamAgentPrompt(
  sessionId: string,
  body: AgentPromptParams,
  onFrame: (frame: AgentSseFrame) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/agent/${sessionId}/prompt`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let message = `请求失败 (${res.status})`;
    try {
      const json = (await res.json()) as { message?: string };
      if (json.message) message = json.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (!res.body) throw new Error('响应体为空');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) parseSseChunk(part, onFrame);
      if (signal?.aborted) break;
    }
    if (buffer.trim()) parseSseChunk(buffer, onFrame);
  } finally {
    reader.releaseLock();
  }
}
