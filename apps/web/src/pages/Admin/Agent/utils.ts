import type { AgentCloseReason, AgentPromptRunStatus } from '@zeroDraw/api-contract';

export function formatDateTime(ms: number | null | undefined): string {
  if (ms == null) return '—';
  return new Date(ms).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN');
}

export function formatCost(n: number): string {
  if (n === 0) return '¥0';
  return `¥${n.toFixed(4)}`;
}

export const sessionStatusColor: Record<string, string> = {
  active: 'green',
  suspended: 'orange',
  closed: 'default',
};

export const promptRunStatusColor: Record<AgentPromptRunStatus, string> = {
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
  suspended: 'warning',
  aborted: 'default',
};

export const closeReasonLabel: Record<AgentCloseReason, string> = {
  user_close: '用户关闭',
  idle: '空闲超时',
  admin: '管理员',
  error: '错误',
};
