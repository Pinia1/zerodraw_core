import type {
  AgentAdminCloseSessionBody,
  AgentAdminOverview,
  AgentAdminRuntimeList,
  AgentAdminSessionRow,
  AgentAdminSessionsQuery,
  AgentAdminTimeline,
  AgentAdminUsageQuery,
  AgentAdminUsageRow,
} from '@zeroDraw/api-contract';
import { axios, AxiosError } from '@zeroDraw/common';
import { useAdminTokenStore } from '../store/useAdminTokenStore';

export interface AgentAdminSessionsResult {
  list: AgentAdminSessionRow[];
  total: number;
  page: number;
  pageSize: number;
}

const adminRequest = axios.create({
  //@ts-ignore
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 1000 * 60,
  headers: { 'Content-Type': 'application/json' },
});

adminRequest.interceptors.request.use((config) => {
  const token = useAdminTokenStore.getState().token;
  if (token && config.headers) {
    config.headers['X-Admin-Token'] = token;
  }
  return config;
});

adminRequest.interceptors.response.use(
  (response) => {
    const { data, code, message: msg } = response.data;
    if (code !== 1000) {
      return Promise.reject(new Error(msg ?? '请求失败'));
    }
    return data;
  },
  (error: AxiosError<{ message?: string; code?: number }>) => {
    const msg =
      error.response?.data?.message ??
      (error.response?.status === 503
        ? 'Admin 观测未启用（需配置 AGENT_ADMIN_TOKEN）'
        : error.response?.status === 403
          ? 'Admin Token 无效'
          : error.message);
    return Promise.reject(new Error(msg));
  },
);

export const httpAdminAgentOverview = (): Promise<AgentAdminOverview> =>
  adminRequest.get('/api/admin/agent/overview');

export const httpAdminAgentRuntime = (): Promise<AgentAdminRuntimeList> =>
  adminRequest.get('/api/admin/agent/runtime');

export const httpAdminAgentSessions = (
  query: AgentAdminSessionsQuery,
): Promise<AgentAdminSessionsResult> => adminRequest.get('/api/admin/agent/sessions', { params: query });

export const httpAdminAgentTimeline = (sessionId: string): Promise<AgentAdminTimeline> =>
  adminRequest.get(`/api/admin/agent/sessions/${sessionId}/timeline`);

export const httpAdminAgentUsage = (query: AgentAdminUsageQuery): Promise<AgentAdminUsageRow[]> =>
  adminRequest.get('/api/admin/agent/usage', { params: query });

export const httpAdminAgentCloseSession = (
  sessionId: string,
  body?: AgentAdminCloseSessionBody,
): Promise<{ id: string; closeReason: string }> =>
  adminRequest.post(`/api/admin/agent/sessions/${sessionId}/close`, body ?? { closeReason: 'admin' });
