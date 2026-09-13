import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { createLibModule } from './factory';
import { libRoutes } from './lib.routes';

async function libPluginImpl(fastify: FastifyInstance): Promise<void> {
  const { libService } = createLibModule();
  fastify.decorate('libService', libService);

  await fastify.register(libRoutes, { prefix: '/api/lib' });
}

export const libPlugin = fp(libPluginImpl, {
  name: '@zeroDraw/lib',
  dependencies: ['@zeroDraw/auth'],
  fastify: '5.x',
});
