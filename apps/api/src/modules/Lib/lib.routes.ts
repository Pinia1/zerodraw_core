import { paginationQuerySchema } from '@zeroDraw/api-contract';
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

    const { page, pageSize, keyword } = queryResult.data;
    const userId = request.user.userId;

    const data = await libService.getOutputs({ userId, page, pageSize, keyword });

    return reply.send(createSuccessResponse(data));
  });
}
