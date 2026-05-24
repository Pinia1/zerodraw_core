import {
  AI_RENDER_DEFAULT_HTTP_URL,
  aiRenderHealthResponseSchema,
  type AIRenderHealthResponse,
} from '@zeroDraw/api-contract';

const getHttpBaseUrl = () =>
  // @ts-expect-error vite inject
  (import.meta.env?.VITE_AI_RENDER_HTTP_URL as string | undefined) || AI_RENDER_DEFAULT_HTTP_URL;

/** 检查本地 AI 渲染服务是否可用 */
export async function fetchAIRenderHealth(): Promise<AIRenderHealthResponse> {
  const res = await fetch(`${getHttpBaseUrl()}/health`);
  if (!res.ok) {
    throw new Error(`AI render health check failed: HTTP ${res.status}`);
  }
  const json = await res.json();
  return aiRenderHealthResponseSchema.parse(json);
}
