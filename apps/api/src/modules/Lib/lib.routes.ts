import {
  deleteOutputResponseSchema,
  paginationQuerySchema,
  runningQuerySchema,
} from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { createSuccessResponse } from '../../types/response';
import { QueryValidation } from '../../utils/schame';
import { authenticate } from '../Auth/auth.middleware';
import { libService } from './lib.services';

export async function libRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  app.get('/outputs', async (request, reply) => {
    const queryResult = QueryValidation(paginationQuerySchema, request.query);

    const { page, pageSize, keyword, projectId, startDate, endDate } = queryResult;
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

    return reply.send(createSuccessResponse(data));
  });

  app.get('/running', async (request, reply) => {
    const queryResult = QueryValidation(runningQuerySchema, request.query);

    const { action, startDate, endDate } = queryResult;
    const userId = request.user.userId;

    const data = await libService.getRunning({ userId, action, startDate, endDate });

    return reply.send(createSuccessResponse(data));
  });

  app.delete('/outputs/:id', async (request, reply) => {
    const paramsResult = QueryValidation(deleteOutputResponseSchema, request.params);

    const { id } = paramsResult;
    const userId = request.user.userId;

    await libService.deleteOutput({ id, userId });

    return reply.send(createSuccessResponse(id));
  });
}
