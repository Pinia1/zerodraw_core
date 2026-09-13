import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { assetsRoutes } from './assets.routes';
import { createAssetsModule } from './factory';

async function assetsPluginImpl(fastify: FastifyInstance): Promise<void> {
  const { assetsService } = createAssetsModule();
  fastify.decorate('assetsService', assetsService);

  await fastify.register(assetsRoutes, { prefix: '/api/assets' });
}

export const assetsPlugin = fp(assetsPluginImpl, {
  name: '@zeroDraw/assets',
  dependencies: ['@zeroDraw/auth'],
  fastify: '5.x',
});
