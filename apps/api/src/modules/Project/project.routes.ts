import {
  createProjectSchema,
  listProjectQuerySchema,
  projectIdParamSchema,
  saveLayersSchema,
  updateProjectSchema,
} from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { createSuccessResponse } from '../../types/response';
import { QueryValidation } from '../../utils/schame';
import { authenticate } from '../Auth/auth.middleware';
import { projectService } from './project.services';

export async function projectRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  /** 项目列表 */
  app.get('/', async (request, reply) => {
    const query = QueryValidation(listProjectQuerySchema, request.query);
    const userId = request.user.userId;

    const data = await projectService.listProjects({ userId, ...query });
    return reply.send(createSuccessResponse(data));
  });

  /** 创建项目 */
  app.post('/', async (request, reply) => {
    const body = QueryValidation(createProjectSchema, request.body);
    const userId = request.user.userId;

    const data = await projectService.createProject({ userId, ...body });
    return reply.status(201).send(createSuccessResponse(data));
  });

  /** 获取项目详情（含所有图层） */
  app.get('/:id', async (request, reply) => {
    const { id } = QueryValidation(projectIdParamSchema, request.params);
    const userId = request.user.userId;

    const data = await projectService.getProject({ id, userId });
    return reply.send(createSuccessResponse(data));
  });

  /** 更新项目元数据 */
  app.patch('/:id', async (request, reply) => {
    const { id } = QueryValidation(projectIdParamSchema, request.params);
    const body = QueryValidation(updateProjectSchema, request.body);
    const userId = request.user.userId;

    await projectService.updateProject({ id, userId, ...body });
    return reply.send(createSuccessResponse(id));
  });

  /** 批量保存图层（全量替换） */
  app.put('/:id/layers', async (request, reply) => {
    const { id } = QueryValidation(projectIdParamSchema, request.params);
    const body = QueryValidation(saveLayersSchema, request.body);
    const userId = request.user.userId;

    await projectService.saveLayers({ projectId: id, userId, ...body });
    return reply.send(createSuccessResponse(id));
  });

  /** 软删除（移入回收站） */
  app.delete('/:id', async (request, reply) => {
    const { id } = QueryValidation(projectIdParamSchema, request.params);
    const userId = request.user.userId;

    await projectService.deleteProject({ id, userId });
    return reply.send(createSuccessResponse(id));
  });

  /** 从回收站恢复 */
  app.post('/:id/restore', async (request, reply) => {
    const { id } = QueryValidation(projectIdParamSchema, request.params);
    const userId = request.user.userId;

    await projectService.restoreProject({ id, userId });
    return reply.send(createSuccessResponse(id));
  });

  /** 永久删除 */
  app.delete('/:id/permanent', async (request, reply) => {
    const { id } = QueryValidation(projectIdParamSchema, request.params);
    const userId = request.user.userId;

    await projectService.permanentDeleteProject({ id, userId });
    return reply.send(createSuccessResponse(id));
  });
}
