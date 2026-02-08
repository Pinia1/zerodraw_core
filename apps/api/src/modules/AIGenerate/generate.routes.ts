import { seedreamGenerateSchema, seedreamGetTaskResponseSchema } from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { createSuccessResponse } from '../../types/response';
import { BadRequestError } from '../../utils/errors';
import { authenticate } from '../Auth/auth.middleware';
import { generateService } from './generate.services';

export async function generateRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  // 提交生成任务，立即返回 taskId
  app.post('/seedream', async (request, reply) => {
    const queryResult = seedreamGenerateSchema.safeParse(request.body);
    if (!queryResult.success) {
      throw new BadRequestError();
    }

    const response = await generateService.run(request.user.userId, queryResult.data);
    return reply.send(createSuccessResponse(response));
  });

  app.get('/task/:id', async (request, reply) => {
    const queryResult = seedreamGetTaskResponseSchema.safeParse(request.params);
    if (!queryResult.success) {
      throw new BadRequestError();
    }
    const { id } = queryResult.data;
    const result = await generateService.getTask(id, request.user.userId);
    return reply.send(createSuccessResponse(result));
  });
}
