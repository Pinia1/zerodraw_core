import type { ImageContent } from '@earendil-works/pi-ai';
import type { AgentPromptImage } from '@zeroDraw/api-contract';
import type * as dbSchema from '@zeroDraw/db/schema';
import { setAgentRuntimeLogger, type AgentRuntimeLogger } from '@zeroDraw/agent-worker/runtime';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import BetterSqlite3 from 'better-sqlite3';

export type AgentSqliteDatabase = InstanceType<typeof BetterSqlite3>;
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AgentDeps } from './tools/deps';
import type { AgentRedisLike } from './observability/types';

export interface AgentHttpErrors {
  business: (message: string) => Error;
  forbidden: (message?: string) => Error;
  notFound: (message?: string) => Error;
}

export interface AgentEnvConfig {
  AGENT_MODEL: string;
  AGENT_BASE_URL: string;
  AGENT_API_KEY: string;
  AGENT_RUNTIME_HOST: 'inprocess' | 'worker';
  /** worker 模式下 fork 子进程池大小（session 按最少负载 + 亲和性分配） */
  AGENT_WORKER_POOL_SIZE: number;
  /** harness 空闲多久后自动关闭（毫秒，仅释放内存；DB session 保留） */
  AGENT_HARNESS_IDLE_MS: number;
  /** Admin 观测台 token；未设置则禁用 /api/admin/agent */
  AGENT_ADMIN_TOKEN?: string;
  /** 超过此时间的 running prompt run 在启动时被标记 aborted（毫秒） */
  AGENT_PROMPT_RUN_STALE_MS: number;
  /** 超过此时间无活动的会话在启动时以 idle 关闭；0 表示禁用（毫秒） */
  AGENT_SESSION_IDLE_CLOSE_MS: number;
}

export type AgentDatabase = BetterSQLite3Database<typeof dbSchema>;

export type AgentAuthenticateHook = (
  request: FastifyRequest,
  reply: FastifyReply,
) => void | Promise<void>;

export interface AgentModuleConfig {
  db: AgentDatabase;
  sqlite: AgentSqliteDatabase;
  logger: AgentRuntimeLogger;
  env: AgentEnvConfig;
  deps: AgentDeps;
  errors: AgentHttpErrors;
  authenticate: AgentAuthenticateHook;
  buildPromptImageContents: (
    images: AgentPromptImage[] | undefined,
  ) => Promise<ImageContent[] | undefined>;
  /** fork 子进程入口（由 API 宿主注入绝对路径） */
  workerEntryPath?: string;
  /** Redis（观测 runtime snapshot）；未注入则使用进程内内存 */
  redis?: AgentRedisLike;
}

let moduleConfig: AgentModuleConfig | null = null;

export function configureAgentModule(config: AgentModuleConfig): void {
  moduleConfig = config;
  setAgentRuntimeLogger(config.logger);
}

export function getAgentModuleConfig(): AgentModuleConfig {
  if (!moduleConfig) {
    throw new Error('@zeroDraw/agent: call configureAgentModule() before using the agent module');
  }
  return moduleConfig;
}

export function getAgentDb(): AgentDatabase {
  return getAgentModuleConfig().db;
}

export function getAgentSqlite(): AgentSqliteDatabase {
  return getAgentModuleConfig().sqlite;
}

export function getAgentLogger(): AgentRuntimeLogger {
  return getAgentModuleConfig().logger;
}

export function getAgentEnv(): AgentEnvConfig {
  return getAgentModuleConfig().env;
}

export function getAgentDeps(): AgentDeps {
  return getAgentModuleConfig().deps;
}

export function getAgentErrors(): AgentHttpErrors {
  return getAgentModuleConfig().errors;
}
