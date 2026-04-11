import type { ProjectDetail, ProjectItem, ProjectLayerDetail } from '@zeroDraw/api-contract';
import { and, desc, eq, project, projectLayer, sql } from '@zeroDraw/db';
import { isNull } from 'drizzle-orm';
import { db } from '../../db';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import type {
  CreateProjectParams,
  DeleteProjectParams,
  GetProjectParams,
  ListProjectParams,
  SaveLayersParams,
  UpdateProjectParams,
} from './project.type';

class ProjectService {
  async listProjects({ userId, page, pageSize, keyword, deleted }: ListProjectParams) {
    const offset = (page - 1) * pageSize;

    const conditions = [eq(project.userId, userId)];

    if (deleted) {
      conditions.push(sql`${project.deletedAt} IS NOT NULL`);
    } else {
      conditions.push(isNull(project.deletedAt));
    }

    if (keyword) {
      conditions.push(sql`${project.name} LIKE ${'%' + keyword + '%'}`);
    }

    const baseWhere = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(project)
      .where(baseWhere);

    const total = Number(countResult?.count ?? 0);

    const list = await db
      .select({
        id: project.id,
        name: project.name,
        thumbnailKey: project.thumbnailKey,
        canvasWidth: project.canvasWidth,
        canvasHeight: project.canvasHeight,
        backgroundColor: project.backgroundColor,
        backgroundVisible: project.backgroundVisible,
        createdAt: sql<number>`UNIX_TIMESTAMP(${project.createdAt}) * 1000`,
        updatedAt: sql<number>`UNIX_TIMESTAMP(${project.updatedAt}) * 1000`,
      })
      .from(project)
      .where(baseWhere)
      .orderBy(desc(project.updatedAt))
      .limit(pageSize)
      .offset(offset);

    return { list: list as ProjectItem[], total, page, pageSize };
  }

  async getProject({ id, userId }: GetProjectParams): Promise<ProjectDetail> {
    const [row] = await db
      .select({
        id: project.id,
        name: project.name,
        thumbnailKey: project.thumbnailKey,
        canvasWidth: project.canvasWidth,
        canvasHeight: project.canvasHeight,
        backgroundColor: project.backgroundColor,
        backgroundVisible: project.backgroundVisible,
        createdAt: sql<number>`UNIX_TIMESTAMP(${project.createdAt}) * 1000`,
        updatedAt: sql<number>`UNIX_TIMESTAMP(${project.updatedAt}) * 1000`,
      })
      .from(project)
      .where(and(eq(project.id, id), eq(project.userId, userId), isNull(project.deletedAt)));

    if (!row) throw new NotFoundError();

    const layers = await db
      .select()
      .from(projectLayer)
      .where(eq(projectLayer.projectId, id))
      .orderBy(projectLayer.order);

    return {
      ...row,
      layers: layers.map((l) => ({
        id: l.id,
        name: l.name,
        order: l.order,
        opacity: l.opacity,
        visible: l.visible,
        blendMode: l.blendMode,
        filter: (l.filter as any) ?? null,
        content: (l.content as any) ?? {},
      })) as ProjectLayerDetail[],
    };
  }

  async createProject({
    userId,
    name,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    backgroundVisible,
  }: CreateProjectParams) {
    const id = crypto.randomUUID();

    await db.insert(project).values({
      id,
      userId,
      name,
      canvasWidth,
      canvasHeight,
      backgroundColor,
      backgroundVisible,
    });

    const [row] = await db
      .select({
        id: project.id,
        name: project.name,
        thumbnailKey: project.thumbnailKey,
        canvasWidth: project.canvasWidth,
        canvasHeight: project.canvasHeight,
        backgroundColor: project.backgroundColor,
        backgroundVisible: project.backgroundVisible,
        createdAt: sql<number>`UNIX_TIMESTAMP(${project.createdAt}) * 1000`,
        updatedAt: sql<number>`UNIX_TIMESTAMP(${project.updatedAt}) * 1000`,
      })
      .from(project)
      .where(eq(project.id, id));

    return row as ProjectItem;
  }

  async updateProject({ id, userId, ...fields }: UpdateProjectParams) {
    const [existing] = await db
      .select({ userId: project.userId })
      .from(project)
      .where(and(eq(project.id, id), isNull(project.deletedAt)));

    if (!existing) throw new NotFoundError();
    if (existing.userId !== userId) throw new ForbiddenError();

    const updateData: Record<string, unknown> = {};
    if (fields.name !== undefined) updateData.name = fields.name;
    if (fields.thumbnailKey !== undefined) updateData.thumbnailKey = fields.thumbnailKey;
    if (fields.canvasWidth !== undefined) updateData.canvasWidth = fields.canvasWidth;
    if (fields.canvasHeight !== undefined) updateData.canvasHeight = fields.canvasHeight;
    if (fields.backgroundColor !== undefined) updateData.backgroundColor = fields.backgroundColor;
    if (fields.backgroundVisible !== undefined)
      updateData.backgroundVisible = fields.backgroundVisible;

    if (Object.keys(updateData).length > 0) {
      await db.update(project).set(updateData).where(eq(project.id, id));
    }

    return id;
  }

  async saveLayers({ projectId, userId, layers }: SaveLayersParams) {
    const [existing] = await db
      .select({ userId: project.userId })
      .from(project)
      .where(and(eq(project.id, projectId), isNull(project.deletedAt)));

    if (!existing) throw new NotFoundError();
    if (existing.userId !== userId) throw new ForbiddenError();

    // 全量替换：先删除旧图层，再批量插入
    await db.delete(projectLayer).where(eq(projectLayer.projectId, projectId));

    if (layers.length > 0) {
      await db.insert(projectLayer).values(
        layers.map((l) => ({
          id: l.id,
          projectId,
          name: l.name,
          order: l.order,
          opacity: l.opacity,
          visible: l.visible,
          blendMode: l.blendMode,
          filter: l.filter ?? null,
          content: l.content,
        }))
      );
    }

    // 更新项目的 updatedAt
    await db.update(project).set({ updatedAt: new Date() }).where(eq(project.id, projectId));

    return projectId;
  }

  async deleteProject({ id, userId }: DeleteProjectParams) {
    const [existing] = await db
      .select({ userId: project.userId })
      .from(project)
      .where(and(eq(project.id, id), isNull(project.deletedAt)));

    if (!existing) throw new NotFoundError();
    if (existing.userId !== userId) throw new ForbiddenError();

    await db.update(project).set({ deletedAt: new Date() }).where(eq(project.id, id));
    return id;
  }

  async restoreProject({ id, userId }: DeleteProjectParams) {
    const [existing] = await db
      .select({ userId: project.userId })
      .from(project)
      .where(and(eq(project.id, id), sql`${project.deletedAt} IS NOT NULL`));

    if (!existing) throw new NotFoundError();
    if (existing.userId !== userId) throw new ForbiddenError();

    await db.update(project).set({ deletedAt: null }).where(eq(project.id, id));
    return id;
  }

  async permanentDeleteProject({ id, userId }: DeleteProjectParams) {
    const [existing] = await db
      .select({ userId: project.userId })
      .from(project)
      .where(eq(project.id, id));

    if (!existing) throw new NotFoundError();
    if (existing.userId !== userId) throw new ForbiddenError();

    await db.delete(projectLayer).where(eq(projectLayer.projectId, id));
    await db.delete(project).where(eq(project.id, id));
    return id;
  }
}

export const projectService = new ProjectService();
