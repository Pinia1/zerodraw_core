import { FastifyInstance } from 'fastify';
import { createSuccessResponse } from '../types/response';

export async function registerRoutes(app: FastifyInstance) {
  app.get('/health', (_request, reply) => {
    const response = createSuccessResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
    return reply.send(response);
  });
}
