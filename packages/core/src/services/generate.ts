import type { NanobananaGenerateParams, RunningQuery } from '@zeroDraw/api-contract';
import request from '.';

/** 提交 AI 生成任务 */
export const httpSeedreamGenerate = (data: {
  action: string;
  s3Key?: string[];
  args: Record<string, unknown>;
}): Promise<{ taskId: string }> => {
  return request.post('/api/generate/seedream', data);
};

export const httpNanobananaGenerate = (data: {
  action: string;
  s3Key?: string[];
  args: NanobananaGenerateParams['args'];
}): Promise<{ taskId: string }> => {
  return request.post('/api/generate/nano-banana', data);
};

/** 轮询任务状态 */
export const httpGetTask = (
  taskId: string
): Promise<{
  id: string;
  action: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  s3Key: string | null;
  error: string | null;
  createdAt: number;
  args: Record<string, unknown>;
}> => {
  return request.get(`/api/generate/task/${taskId}`);
};

export const httpGetLibOutputs = (params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  projectId?: string;
}): Promise<{
  list: LibOutput[];
  total: number;
  page: number;
  pageSize: number;
}> => {
  return request.get('/api/lib/outputs', { params });
};

export const httpDeleteLibOutput = (id: string): Promise<string> => {
  return request.delete(`/api/lib/outputs/${id}`);
};

export const httpGetLibRunning = (params?: Partial<RunningQuery>): Promise<RunningItem[]> => {
  return request.get('/api/lib/running', { params });
};

const httpGetR2PresignUrl = (contentType: string): Promise<{ key: string; uploadUrl: string }> => {
  return request.post('/api/file/r2/presign', { contentType });
};

export const httpUpload = async (file: File): Promise<string> => {
  const { key, uploadUrl } = await httpGetR2PresignUrl(file.type);
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  return key;
};

export const httpGetFileUrl = (key: string): Promise<string> => {
  return request.get(`/api/file/url/${key}`);
};
