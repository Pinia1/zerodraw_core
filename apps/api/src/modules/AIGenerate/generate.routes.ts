import { seedreamGenerateSchema } from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { createSuccessResponse } from '../../types/response';
import { BadRequestError } from '../../utils/errors';
import { authenticate } from '../Auth/auth.middleware';
import { seedreamService } from '../Seedream/seedream.services';

export async function generateRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  app.post('/seedream', async (request, reply) => {
    const queryResult = seedreamGenerateSchema.safeParse(request.body);
    if (!queryResult.success) {
      throw new BadRequestError('invalid params');
    }

    const response = await seedreamService.generate(queryResult.data);
    return reply.send(createSuccessResponse(response));
  });
}
