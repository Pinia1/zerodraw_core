import { ZodTypeProvider } from '@fastify/type-provider-zod';
import {
  createProjectSchema,
  listProjectQuerySchema,
  saveLayersSchema,
  updateProjectSchema,
} from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../Auth/auth.middleware';
import { projectService } from './project.services';

export async function projectRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.addHook('onRequest', authenticate);

  app.get('/', { schema: { querystring: listProjectQuerySchema } }, async (request, reply) => {
    const userId = request.user.userId;
    const data = await projectService.listProjects({ userId, ...request.query });
    return reply.success(data);
  });

  app.post('/', { schema: { body: createProjectSchema } }, async (request, reply) => {
    const userId = request.user.userId;
    const data = await projectService.createProject({ userId, ...request.body });
    return reply.success(data);
  });

  app.get('/:id', { schema: { params: z.object({ id: z.string() }) } }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.userId;
    const data = await projectService.getProject({ id, userId });
    return reply.success(data);
  });

  app.patch(
    '/:id',
    { schema: { params: z.object({ id: z.string() }), body: updateProjectSchema } },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.userId;

      await projectService.updateProject({ id, userId, ...request.body });
      return reply.success(id);
    }
  );

  /** 批量保存图层（全量替换） */
  app.put(
    '/:id/layers',
    { schema: { params: z.object({ id: z.string() }), body: saveLayersSchema } },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.userId;

      await projectService.saveLayers({ projectId: id, userId, ...request.body });
      return reply.success(id);
    }
  );

  app.delete(
    '/:id',
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.userId;

      await projectService.deleteProject({ id, userId });
      return reply.success(id);
    }
  );

  /** 从回收站恢复 */
  app.post(
    '/:id/restore',
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.userId;

      await projectService.restoreProject({ id, userId });
      return reply.success(id);
    }
  );

  /** 永久删除 */
  app.delete(
    '/:id/permanent',
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.userId;

      await projectService.permanentDeleteProject({ id, userId });
      return reply.success(id);
    }
  );
}
