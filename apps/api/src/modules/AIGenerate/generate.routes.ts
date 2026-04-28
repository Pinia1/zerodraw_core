import {
  nanobananaGenerateSchema,
  seedreamGenerateSchema,
  seedreamGetTaskResponseSchema,
} from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { userRateLimit } from '../../plugins/userRateLimit';
import { createSuccessResponse } from '../../types/response';
import { QueryValidation } from '../../utils/schame';
import { authenticate } from '../Auth/auth.middleware';
import { generateService } from './generate.services';

const nanoBananaRateLimit = userRateLimit({ max: 6, windowSec: 60, keyPrefix: 'rl:nano-banana' });

export async function generateRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  app.post('/seedream', async (request, reply) => {
    const queryResult = QueryValidation(seedreamGenerateSchema, request.body);

    const response = await generateService.run(request.user.userId, queryResult);
    return reply.send(createSuccessResponse(response));
  });

  app.get('/task/:id', async (request, reply) => {
    const queryResult = QueryValidation(seedreamGetTaskResponseSchema, request.params);
    const { id } = queryResult;
    const result = await generateService.getTask(id, request.user.userId);
    return reply.send(createSuccessResponse(result));
  });

  app.post('/nano-banana', { preHandler: nanoBananaRateLimit }, async (request, reply) => {
    const queryResult = QueryValidation(nanobananaGenerateSchema, request.body);
    const response = await generateService.run(request.user.userId, queryResult);
    return reply.send(createSuccessResponse(response));
  });
}

export async function generateWebhookRoutes(app: FastifyInstance) {
  app.post('/webhook/:taskId', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    await generateService.handleWebhook(taskId, request.body);
    return reply.send({ code: 0 });
  });
}
