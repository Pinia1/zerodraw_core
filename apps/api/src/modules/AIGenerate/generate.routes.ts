import { ZodTypeProvider } from '@fastify/type-provider-zod';
import {
  nanobananaGenerateSchema,
  seedreamGenerateSchema,
  seedreamGetTaskResponseSchema,
} from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { userRateLimit } from '../../plugins/userRateLimit';
import { QueryValidation } from '../../utils/schame';
import { authenticate } from '../Auth/auth.middleware';
import { generateService } from './generate.services';

const nanoBananaRateLimit = userRateLimit({ max: 6, windowSec: 60, keyPrefix: 'rl:nano-banana' });

export async function generateRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.addHook('onRequest', authenticate);

  app.post('/seedream', async (request, reply) => {
    const queryResult = QueryValidation(seedreamGenerateSchema, request.body);

    const response = await generateService.run(request.user.userId, queryResult);
    return reply.success(response);
  });

  app.get(
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

  app.post(
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
