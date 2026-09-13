import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { authenticate } from './auth.middleware';
import { authRoutes } from './auth.routes';
import { createAuthModule } from './factory';

async function authPluginImpl(fastify: FastifyInstance): Promise<void> {
  const { authService } = createAuthModule();

  fastify.decorate('authenticate', authenticate);
  fastify.decorate('authService', authService);

  await fastify.register(authRoutes, { prefix: '/api/auth' });
}

export const authPlugin = fp(authPluginImpl, {
  name: '@zeroDraw/auth',
  fastify: '5.x',
});
