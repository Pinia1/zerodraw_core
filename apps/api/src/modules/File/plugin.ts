import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { fileRoutes } from './file.routes';

async function filePluginImpl(fastify: FastifyInstance): Promise<void> {
  await fastify.register(fileRoutes, { prefix: '/api/file' });
}

export const filePlugin = fp(filePluginImpl, {
  name: '@zeroDraw/file',
  dependencies: ['@zeroDraw/auth', '@zeroDraw/infra'],
  fastify: '5.x',
});
