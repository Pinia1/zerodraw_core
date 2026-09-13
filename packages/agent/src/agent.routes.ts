import { ZodTypeProvider } from '@fastify/type-provider-zod';
import {
  agentCreateSessionSchema,
  agentFrontendToolCompleteSchema,
  agentListQuerySchema,
  agentPromptSchema,
  agentResumeSchema,
  agentSessionParamsSchema,
  type AgentCreateSessionParams,
  type AgentFrontendToolCompleteParams,
  type AgentListQuery,
  type AgentPromptParams,
  type AgentResumeParams,
  type AgentSessionParams,
} from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { getAgentModuleConfig } from './config';
import { withAgentPromptLock } from './runtime/prompt-lock';

export async function agentRoutes(fastify: FastifyInstance) {
  const { authenticate, buildPromptImageContents } = getAgentModuleConfig();
  const { agentService } = fastify;
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.addHook('onRequest', authenticate);

  app.post('/', { schema: { body: agentCreateSessionSchema } }, async (request, reply) => {
    const userId = request.user.userId;
    const body = request.body as AgentCreateSessionParams;
    const data = await agentService.createSession(userId, body);
    return reply.success(data);
  });

  app.get('/', { schema: { querystring: agentListQuerySchema } }, async (request, reply) => {
    const userId = request.user.userId;
    const query = request.query as AgentListQuery;
    const data = await agentService.listSessions(userId, query);
    return reply.success(data);
  });

  app.get('/:id', { schema: { params: agentSessionParamsSchema } }, async (request, reply) => {
    const userId = request.user.userId;
    const params = request.params as AgentSessionParams;
    const data = await agentService.getSession(params.id, userId);
    return reply.success(data);
  });

  app.delete('/:id', { schema: { params: agentSessionParamsSchema } }, async (request, reply) => {
    const userId = request.user.userId;
    const params = request.params as AgentSessionParams;
    const data = await agentService.closeSession(params.id, userId);
    return reply.success(data);
  });

  /** SSE 流式对话。 */
  app.post(
    '/:id/prompt',
    { schema: { params: agentSessionParamsSchema, body: agentPromptSchema } },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params as AgentSessionParams;
      const { message, images } = request.body as AgentPromptParams;

      const imageContents = await buildPromptImageContents(images);

      reply.hijack();
      await withAgentPromptLock(id, () =>
        agentService.streamPrompt(id, userId, {
          message,
          images: imageContents,
          raw: reply.raw,
          corsOrigin: request.headers.origin,
          markSuspended: agentService.markSuspended.bind(agentService),
          markActive: agentService.markActive.bind(agentService),
        }),
      );
    },
  );

  /** 浏览器完成 deferred 前端工具。 */
  app.post(
    '/:id/frontend-tools/complete',
    { schema: { params: agentSessionParamsSchema, body: agentFrontendToolCompleteSchema } },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params as AgentSessionParams;
      const body = request.body as AgentFrontendToolCompleteParams;
      const data = await agentService.completeFrontendTool(id, userId, body);
      return reply.success(data);
    },
  );

  /** 放行或拒绝被挂起的 deferred 操作。 */
  app.post(
    '/:id/resume',
    { schema: { params: agentSessionParamsSchema, body: agentResumeSchema } },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params as AgentSessionParams;
      const body = request.body as AgentResumeParams;
      const data = await agentService.resumeSession(id, userId, body);
      return reply.success(data);
    },
  );
}
