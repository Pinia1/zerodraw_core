import {
  CreateProjectInput,
  createProjectSchema,
  ListProjectQuery,
  listProjectQuerySchema,
  SaveLayersInput,
  saveLayersSchema,
  UpdateProjectInput,
} from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../Auth/auth.middleware';
import { projectService } from './project.services';

export async function projectRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  app.get<{ Querystring: ListProjectQuery }>(
    '/',
    { schema: { querystring: listProjectQuerySchema } },
    async (request, reply) => {
      const userId = request.user.userId;
      const data = await projectService.listProjects({ userId, ...request.query });
      return reply.success(data);
    }
  );

  app.post<{ Body: CreateProjectInput }>(
    '/',
    { schema: { body: createProjectSchema } },
    async (request, reply) => {
      const userId = request.user.userId;
      const data = await projectService.createProject({ userId, ...request.body });
      return reply.success(data);
    }
  );

  app.get<{ Params: { id: string } }>(
    '/:id',
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.userId;
      const data = await projectService.getProject({ id, userId });
      return reply.success(data);
    }
  );

  app.patch<{ Params: { id: string }; Body: UpdateProjectInput }>(
    '/:id',
    { schema: { params: z.object({ id: z.string() }) } },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.userId;

      await projectService.updateProject({ id, userId, ...request.body });
      return reply.success(id);
    }
  );

  /** 批量保存图层（全量替换） */
  app.put<{ Params: { id: string }; Body: SaveLayersInput }>(
    '/:id/layers',
    { schema: { params: z.object({ id: z.string() }), body: saveLayersSchema } },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.userId;

      await projectService.saveLayers({ projectId: id, userId, ...request.body });
      return reply.success(id);
    }
  );

  app.delete<{ Params: { id: string } }>(
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
  app.post<{ Params: { id: string } }>(
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
  app.delete<{ Params: { id: string } }>(
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
