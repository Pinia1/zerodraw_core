import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { createProjectModule } from './factory';
import { projectRoutes } from './project.routes';

async function projectPluginImpl(fastify: FastifyInstance): Promise<void> {
  const { projectService } = createProjectModule();
  fastify.decorate('projectService', projectService);

  await fastify.register(projectRoutes, { prefix: '/api/project' });
}

export const projectPlugin = fp(projectPluginImpl, {
  name: '@zeroDraw/project',
  dependencies: ['@zeroDraw/auth'],
  fastify: '5.x',
});
