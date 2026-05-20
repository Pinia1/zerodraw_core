import { ZodTypeProvider } from '@fastify/type-provider-zod';
import { paginationQuerySchema, runningQuerySchema } from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../Auth/auth.middleware';
import { libService } from './lib.services';

export async function libRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.addHook('onRequest', authenticate);

  app.get(
    '/outputs',
    { schema: { querystring: paginationQuerySchema } },
    async (request, reply) => {
      const { page, pageSize, keyword, projectId, startDate, endDate } = request.query;
      const userId = request.user.userId;

      const data = await libService.getOutputs({
        userId,
        page,
        pageSize,
        keyword,
        projectId,
        startDate,
        endDate,
      });

      return reply.success(data);
    }
  );

  app.get('/running', { schema: { querystring: runningQuerySchema } }, async (request, reply) => {
    const { action, projectId, startDate, endDate } = request.query;
    const userId = request.user.userId;

    const data = await libService.getRunning({ userId, action, projectId, startDate, endDate });

    return reply.success(data);
  });

  app.delete(
    '/outputs/:id',
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.userId;

      await libService.deleteOutput({ id, userId });

      return reply.success(id);
    }
  );
}
