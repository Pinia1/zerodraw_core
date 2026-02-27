import request from '.';

/** 提交 AI 生成任务 */
export const httpSeedreamGenerate = (data: {
  action: string;
  s3Key?: string[];
  args: Record<string, unknown>;
}): Promise<{ taskId: string }> => {
  return request.post('/api/generate/seedream', data);
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
  createdAt: string;
  args: Record<string, unknown>;
}> => {
  return request.get(`/api/generate/task/${taskId}`);
};

export const httpGetLibOutputs = (params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
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
