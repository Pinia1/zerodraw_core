import {
  nanobananaGenerateSchema,
  seedreamGenerateSchema,
  seedreamGetTaskResponseSchema,
} from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { createSuccessResponse } from '../../types/response';
import { QueryValidation } from '../../utils/schame';
import { authenticate } from '../Auth/auth.middleware';
import { generateService } from './generate.services';

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

  app.post('/nano-banana', async (request, reply) => {
    const queryResult = QueryValidation(nanobananaGenerateSchema, request.body);

    const response = await generateService.run(request.user.userId, queryResult);
    return reply.send(createSuccessResponse(response));
  });
}
