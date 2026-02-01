import { FastifyInstance } from 'fastify';
import { authRoutes } from '../modules/Auth/auth.routes';
import { createSuccessResponse } from '../types/response';

export async function registerRoutes(app: FastifyInstance) {
  app.get('/health', (request, reply) => {
    const response = createSuccessResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
    return reply.send(response);
  });

  await app.register(authRoutes, {
    prefix: '/api/auth',
  });
}
