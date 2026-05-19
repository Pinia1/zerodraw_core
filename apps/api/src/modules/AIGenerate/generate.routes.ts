import {
  NanobananaGenerateParams,
  nanobananaGenerateSchema,
  seedreamGenerateSchema,
  SeedreamGetTaskResponse,
  seedreamGetTaskResponseSchema,
} from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { userRateLimit } from '../../plugins/userRateLimit';
import { QueryValidation } from '../../utils/schame';
import { authenticate } from '../Auth/auth.middleware';
import { generateService } from './generate.services';

const nanoBananaRateLimit = userRateLimit({ max: 6, windowSec: 60, keyPrefix: 'rl:nano-banana' });

export async function generateRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  app.post('/seedream', async (request, reply) => {
    const queryResult = QueryValidation(seedreamGenerateSchema, request.body);

    const response = await generateService.run(request.user.userId, queryResult);
    return reply.success(response);
  });

  app.get<{ Params: SeedreamGetTaskResponse }>(
    '/task/:id',
    {
      schema: {
        params: seedreamGetTaskResponseSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const result = await generateService.getTask(id, request.user.userId);
      return reply.success(result);
    }
  );

  app.post<{ Body: NanobananaGenerateParams }>(
    '/nano-banana',
    {
      preHandler: nanoBananaRateLimit,
      schema: {
        body: nanobananaGenerateSchema,
      },
    },
    async (request, reply) => {
      const response = await generateService.run(request.user.userId, request.body);
      return reply.success(response);
    }
  );
}

export async function generateWebhookRoutes(app: FastifyInstance) {
  app.post<{ Params: { taskId: string } }>(
    '/webhook/:taskId',
    { schema: { params: z.object({ taskId: z.string() }) } },
    async (request, reply) => {
      const { taskId } = request.params;
      await generateService.handleWebhook(taskId, request.body);
      return reply.success(null);
    }
  );
}
