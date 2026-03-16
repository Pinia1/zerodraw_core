import { deleteOutputResponseSchema, paginationQuerySchema } from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { createSuccessResponse } from '../../types/response';
import { authenticate } from '../Auth/auth.middleware';
import { libService } from './lib.services';

export async function libRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  app.get('/outputs', async (request, reply) => {
    const queryResult = paginationQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.code(400).send({ message: 'Invalid query parameters' });
    }

    const { page, pageSize, keyword, projectId } = queryResult.data;
    const userId = request.user.userId;

    const data = await libService.getOutputs({ userId, page, pageSize, keyword, projectId });

    return reply.send(createSuccessResponse(data));
  });

  app.delete('/outputs/:id', async (request, reply) => {
    const paramsResult = deleteOutputResponseSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.code(400).send({ message: 'Invalid parameters' });
    }

    const { id } = paramsResult.data;
    const userId = request.user.userId;

    await libService.deleteOutput({ id, userId });

    return reply.send(createSuccessResponse(id));
  });
}
