import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { createGenerateModule } from './factory';
import { generateRoutes } from './generate.routes';

async function generatePluginImpl(fastify: FastifyInstance): Promise<void> {
  const { generateService, generateQueue } = createGenerateModule({
    bananaService: fastify.bananaService,
    seedreamService: fastify.seedreamService,
    r2Service: fastify.r2Service,
    uploadServices: fastify.uploadServices,
  });

  fastify.decorate('generateService', generateService);
  fastify.decorate('generateQueue', generateQueue);

  generateQueue.start();

  fastify.addHook('onClose', async () => {
    await generateQueue.close();
  });

  await fastify.register(generateRoutes, { prefix: '/api/generate' });
}

export const generatePlugin = fp(generatePluginImpl, {
  name: '@zeroDraw/generate',
  dependencies: ['@zeroDraw/auth', '@zeroDraw/infra'],
  fastify: '5.x',
});
