import { FastifyInstance } from 'fastify';
import { generateRoutes } from '../modules/AIGenerate';
import { authRoutes } from '../modules/Auth/auth.routes';
import { fileRoutes } from '../modules/File';
import { libRoutes } from '../modules/Lib';
import { projectRoutes } from '../modules/Project';
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
  await app.register(fileRoutes, {
    prefix: '/api/file',
  });
  await app.register(generateRoutes, {
    prefix: '/api/generate',
  });
  await app.register(libRoutes, {
    prefix: '/api/lib',
  });
  await app.register(projectRoutes, {
    prefix: '/api/project',
  });
}
