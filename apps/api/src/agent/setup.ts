import type { AgentModuleConfig } from '@zeroDraw/agent';
import type { FastifyInstance } from 'fastify';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env';
import { db, sqlite } from '../db';
import { authenticate } from '../modules/Auth/auth.middleware';
import { createProjectModule } from '../modules/Project/factory';
import { createBuildPromptImageContents } from './prompt-images';
import { BusinessError, ForbiddenError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getRedis } from '../redis';

const workerEntryPath = join(dirname(fileURLToPath(import.meta.url)), 'agent.worker.ts');

function createBaseAgentModuleConfig(
  deps: Pick<AgentModuleConfig, 'deps' | 'authenticate' | 'buildPromptImageContents'>,
): AgentModuleConfig {
  return {
    db,
    sqlite,
    logger,
    env: {
      AGENT_MODEL: env.AGENT_MODEL,
      AGENT_BASE_URL: env.AGENT_BASE_URL,
      AGENT_API_KEY: env.AGENT_API_KEY,
      AGENT_RUNTIME_HOST: env.AGENT_RUNTIME_HOST,
      AGENT_WORKER_POOL_SIZE: env.AGENT_WORKER_POOL_SIZE,
      AGENT_HARNESS_IDLE_MS: env.AGENT_HARNESS_IDLE_MS,
      AGENT_ADMIN_TOKEN: env.AGENT_ADMIN_TOKEN,
      AGENT_PROMPT_RUN_STALE_MS: env.AGENT_PROMPT_RUN_STALE_MS,
      AGENT_SESSION_IDLE_CLOSE_MS: env.AGENT_SESSION_IDLE_CLOSE_MS,
    },
    redis: getRedis(),
    deps: deps.deps,
    errors: {
      business: (message) => new BusinessError(message),
      forbidden: (message) => new ForbiddenError(message),
      notFound: (message) => new NotFoundError(message),
    },
    authenticate: deps.authenticate,
    buildPromptImageContents: deps.buildPromptImageContents,
    workerEntryPath,
  };
}

export function buildAgentModuleConfig(fastify: FastifyInstance): AgentModuleConfig {
  return createBaseAgentModuleConfig({
    deps: {
      project: fastify.projectService,
    },
    authenticate: fastify.authenticate,
    buildPromptImageContents: createBuildPromptImageContents({
      localStorage: fastify.localStorage,
      r2Service: fastify.r2Service,
      volcService: fastify.volcService,
    }),
  });
}

/** Worker 子进程无 Fastify，需自行装配依赖。 */
export function buildAgentWorkerConfig(): AgentModuleConfig {
  const { projectService } = createProjectModule();

  return createBaseAgentModuleConfig({
    deps: {
      project: projectService,
    },
    authenticate,
    buildPromptImageContents: createBuildPromptImageContents({}),
  });
}
