import { ZodTypeProvider } from '@fastify/type-provider-zod';
import {
  createProjectSchema,
  listProjectQuerySchema,
  saveProjectFlowSchema,
  updateProjectSchema,
} from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

export async function projectRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.addHook('onRequest', fastify.authenticate);

  app.get('/', { schema: { querystring: listProjectQuerySchema } }, async (request, reply) => {
    const userId = request.user.userId;
    const data = await fastify.projectService.listProjects({ userId, ...request.query });
    return reply.success(data);
  });

  app.post('/', { schema: { body: createProjectSchema } }, async (request, reply) => {
    const userId = request.user.userId;
    const data = await fastify.projectService.createProject({ userId, ...request.body });
    return reply.success(data);
  });

  app.get('/:id', { schema: { params: z.object({ id: z.string() }) } }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.userId;
    const data = await fastify.projectService.getProject({ id, userId });
    return reply.success(data);
  });

  app.put(
    '/:id/flow',
    { schema: { params: z.object({ id: z.string() }), body: saveProjectFlowSchema } },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.userId;

      await fastify.projectService.saveProjectFlow({ id, userId, ...request.body });
      return reply.success(id);
    },
  );

  app.patch(
    '/:id',
    { schema: { params: z.object({ id: z.string() }), body: updateProjectSchema } },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.userId;

      await fastify.projectService.updateProject({ id, userId, ...request.body });
      return reply.success(id);
    },
  );

  app.delete(
    '/:id',
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.userId;

      await fastify.projectService.deleteProject({ id, userId });
      return reply.success(id);
    },
  );

  app.post(
    '/:id/restore',
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.userId;

      await fastify.projectService.restoreProject({ id, userId });
      return reply.success(id);
    },
  );

  app.delete(
    '/:id/permanent',
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.userId;

      await fastify.projectService.permanentDeleteProject({ id, userId });
      return reply.success(id);
    },
  );
}
