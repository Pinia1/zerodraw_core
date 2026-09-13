import type { AgentModuleConfig } from '@zeroDraw/agent';
import type { FastifyInstance } from 'fastify';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env';
import { db, pool } from '../db';
import { createGenerateModule } from '../modules/AIGenerate/factory';
import { authenticate } from '../modules/Auth/auth.middleware';
import { BananaService } from '../modules/NanoBanana/banana.services';
import { createProjectModule } from '../modules/Project/factory';
import { R2Service } from '../modules/R2/r2.services';
import { SeedreamService } from '../modules/Seedream/seedream.services';
import { VolcService } from '../modules/Volc/volc.services';
import { createUploadServices } from '../plugins/infra.plugin';
import { BusinessError, ForbiddenError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { redis } from '../redis';
import { createBuildPromptImageContents } from './prompt-images';

const workerEntryPath = join(dirname(fileURLToPath(import.meta.url)), 'agent.worker.ts');

function createBaseAgentModuleConfig(
  deps: Pick<AgentModuleConfig, 'deps' | 'authenticate' | 'buildPromptImageContents'>,
): AgentModuleConfig {
  return {
    db,
    pool,
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
    redis,
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
      generate: fastify.generateService,
    },
    authenticate: fastify.authenticate,
    buildPromptImageContents: createBuildPromptImageContents({
      r2Service: fastify.r2Service,
      volcService: fastify.volcService,
    }),
  });
}

/** Worker 子进程无 Fastify，需自行装配依赖。 */
export function buildAgentWorkerConfig(): AgentModuleConfig {
  const r2Service = new R2Service();
  const volcService = new VolcService();
  const uploadServices = createUploadServices(r2Service, volcService);
  const bananaService = new BananaService(volcService);
  const seedreamService = new SeedreamService(volcService);

  const { projectService } = createProjectModule();
  const { generateService, generateQueue } = createGenerateModule({
    bananaService,
    seedreamService,
    r2Service,
    uploadServices,
  });
  generateQueue.start();

  return createBaseAgentModuleConfig({
    deps: {
      project: projectService,
      generate: generateService,
    },
    authenticate,
    buildPromptImageContents: createBuildPromptImageContents({ r2Service, volcService }),
  });
}
