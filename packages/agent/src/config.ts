import type { ImageContent } from '@earendil-works/pi-ai';
import type { AgentPromptImage } from '@zeroDraw/api-contract';
import type * as dbSchema from '@zeroDraw/db';
import { setAgentRuntimeLogger, type AgentRuntimeLogger } from '@zeroDraw/agent-worker/runtime';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import type { Pool } from 'mysql2/promise';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AgentDeps } from './tools/deps';

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
}

export type AgentDatabase = MySql2Database<typeof dbSchema>;

export type AgentAuthenticateHook = (
  request: FastifyRequest,
  reply: FastifyReply,
) => void | Promise<void>;

export interface AgentModuleConfig {
  db: AgentDatabase;
  pool: Pool;
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

export function getAgentPool(): Pool {
  return getAgentModuleConfig().pool;
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
