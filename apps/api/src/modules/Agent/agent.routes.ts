import { ZodTypeProvider } from '@fastify/type-provider-zod';
import {
  agentCreateSessionSchema,
  agentFrontendToolCompleteSchema,
  agentListQuerySchema,
  agentPromptSchema,
  agentResumeSchema,
  agentSessionParamsSchema,
} from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { authenticate } from '../Auth/auth.middleware';
import { withAgentPromptLock } from './runtime/prompt-lock';
import { streamAgentPrompt } from './runtime/sse';
import { agentService } from './session/service';

export async function agentRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.addHook('onRequest', authenticate);

  app.post('/', { schema: { body: agentCreateSessionSchema } }, async (request, reply) => {
    const userId = request.user.userId;
    const data = await agentService.createSession(userId, request.body);
    return reply.success(data);
  });

  app.get('/', { schema: { querystring: agentListQuerySchema } }, async (request, reply) => {
    const userId = request.user.userId;
    const data = await agentService.listSessions(userId, request.query);
    return reply.success(data);
  });

  app.get('/:id', { schema: { params: agentSessionParamsSchema } }, async (request, reply) => {
    const userId = request.user.userId;
    const data = await agentService.getSession(request.params.id, userId);
    return reply.success(data);
  });

  app.delete('/:id', { schema: { params: agentSessionParamsSchema } }, async (request, reply) => {
    const userId = request.user.userId;
    const data = await agentService.closeSession(request.params.id, userId);
    return reply.success(data);
  });

  /** SSE 流式对话。 */
  app.post(
    '/:id/prompt',
    { schema: { params: agentSessionParamsSchema, body: agentPromptSchema } },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params;
      const { message } = request.body;

      const { harness, lane } = await agentService.getRuntime(id, userId);

      reply.hijack();
      await withAgentPromptLock(id, () =>
        streamAgentPrompt({
          sessionId: id,
          harness,
          lane,
          message,
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
      const { id } = request.params;
      const data = await agentService.completeFrontendTool(id, userId, request.body);
      return reply.success(data);
    },
  );

  /** 放行/拒绝被挂起的 deferred 操作。 */
  app.post(
    '/:id/resume',
    { schema: { params: agentSessionParamsSchema, body: agentResumeSchema } },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params;
      const data = await agentService.resumeSession(id, userId, request.body);
      return reply.success(data);
    },
  );
}
