import { and, desc, eq, project, sql } from '@zeroDraw/db';
import { isNull } from 'drizzle-orm';
import { db } from '../../db';

const projectFields = {
  id: project.id,
  name: project.name,
  thumbnailKey: project.thumbnailKey,
  canvasWidth: project.canvasWidth,
  canvasHeight: project.canvasHeight,
  backgroundColor: project.backgroundColor,
  backgroundVisible: project.backgroundVisible,
  createdAt: sql<number>`UNIX_TIMESTAMP(${project.createdAt}) * 1000`,
  updatedAt: sql<number>`UNIX_TIMESTAMP(${project.updatedAt}) * 1000`,
};

export interface FindProjectsParams {
  userId: number;
  page: number;
  pageSize: number;
  keyword?: string;
  deleted?: boolean;
}

export interface CreateProjectData {
  id: string;
  userId: number;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  backgroundVisible: boolean;
}

class ProjectRepository {
  private buildConditions(userId: number, deleted: boolean, keyword?: string) {
    const conditions = [eq(project.userId, userId)];
    conditions.push(deleted ? sql`${project.deletedAt} IS NOT NULL` : isNull(project.deletedAt));
    if (keyword) conditions.push(sql`${project.name} LIKE ${'%' + keyword + '%'}`);
    return conditions;
  }

  async count(userId: number, deleted: boolean, keyword?: string) {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(project)
      .where(and(...this.buildConditions(userId, deleted, keyword)));
    return Number(row?.count ?? 0);
  }

  async findMany({ userId, page, pageSize, keyword, deleted = false }: FindProjectsParams) {
    const offset = (page - 1) * pageSize;
    return db
      .select(projectFields)
      .from(project)
      .where(and(...this.buildConditions(userId, deleted, keyword)))
      .orderBy(desc(project.updatedAt))
      .limit(pageSize)
      .offset(offset);
  }

  async findById(id: string) {
    const [row] = await db
      .select(projectFields)
      .from(project)
      .where(and(eq(project.id, id), isNull(project.deletedAt)));
    return row ?? null;
  }

  async findOwner(id: string) {
    const [row] = await db
      .select({ userId: project.userId, deletedAt: project.deletedAt })
      .from(project)
      .where(eq(project.id, id));
    return row ?? null;
  }

  async create(data: CreateProjectData) {
    await db.insert(project).values(data);
    return this.findById(data.id);
  }

  async update(id: string, fields: Record<string, unknown>) {
    await db.update(project).set(fields).where(eq(project.id, id));
  }

  async softDelete(id: string) {
    await db.update(project).set({ deletedAt: new Date() }).where(eq(project.id, id));
  }

  async restore(id: string) {
    await db.update(project).set({ deletedAt: null }).where(eq(project.id, id));
  }

  async permanentDelete(id: string) {
    await db.delete(project).where(eq(project.id, id));
  }

  async touchUpdatedAt(id: string) {
    await db.update(project).set({ updatedAt: new Date() }).where(eq(project.id, id));
  }
}

export const projectRepository = new ProjectRepository();
