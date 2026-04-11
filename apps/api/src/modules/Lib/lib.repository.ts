import { aiTask, and, desc, eq, sql } from '@zeroDraw/db';
import { gte, isNull, lte } from 'drizzle-orm';
import { db } from '../../db';

export interface FindOutputsParams {
  userId: number;
  page: number;
  pageSize: number;
  keyword?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}

export interface FindRunningParams {
  userId: number;
  action?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}

class LibRepository {
  private buildOutputConditions({
    userId,
    keyword,
    projectId,
    startDate,
    endDate,
  }: Omit<FindOutputsParams, 'page' | 'pageSize'>) {
    const conditions = [
      eq(aiTask.userId, userId),
      sql`${aiTask.s3Key} IS NOT NULL`,
      isNull(aiTask.deletedAt),
    ];
    if (keyword) {
      conditions.push(
        sql`JSON_UNQUOTE(JSON_EXTRACT(${aiTask.args}, '$.prompt')) LIKE ${'%' + keyword + '%'}`
      );
    }
    if (projectId) {
      conditions.push(
        sql`JSON_UNQUOTE(JSON_EXTRACT(${aiTask.args}, '$.projectId')) = ${projectId}`
      );
    }
    if (startDate) conditions.push(gte(aiTask.createdAt, new Date(startDate)));
    if (endDate) conditions.push(lte(aiTask.createdAt, new Date(endDate)));
    return conditions;
  }

  async countOutputs(params: Omit<FindOutputsParams, 'page' | 'pageSize'>) {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiTask)
      .where(and(...this.buildOutputConditions(params)));
    return Number(row?.count ?? 0);
  }

  async findOutputs({ page, pageSize, ...rest }: FindOutputsParams) {
    const offset = (page - 1) * pageSize;
    return db
      .select({
        id: aiTask.id,
        action: aiTask.action,
        status: aiTask.status,
        s3Key: aiTask.s3Key,
        args: aiTask.args,
        createdAt: sql<number>`UNIX_TIMESTAMP(${aiTask.createdAt}) * 1000`,
      })
      .from(aiTask)
      .where(and(...this.buildOutputConditions(rest)))
      .orderBy(desc(aiTask.createdAt))
      .limit(pageSize)
      .offset(offset);
  }

  async findRunning({ userId, action, projectId, startDate, endDate }: FindRunningParams) {
    const conditions = [
      eq(aiTask.userId, userId),
      sql`${aiTask.status} IN ('pending', 'processing')`,
      isNull(aiTask.deletedAt),
    ];
    if (action) conditions.push(eq(aiTask.action, action));
    if (projectId) {
      conditions.push(
        sql`JSON_UNQUOTE(JSON_EXTRACT(${aiTask.args}, '$.projectId')) = ${projectId}`
      );
    }
    if (startDate) conditions.push(gte(aiTask.createdAt, new Date(startDate)));
    if (endDate) conditions.push(lte(aiTask.createdAt, new Date(endDate)));

    return db
      .select({
        id: aiTask.id,
        action: aiTask.action,
        status: aiTask.status,
        args: aiTask.args,
        createdAt: sql<number>`UNIX_TIMESTAMP(${aiTask.createdAt}) * 1000`,
      })
      .from(aiTask)
      .where(and(...conditions))
      .orderBy(desc(aiTask.createdAt));
  }

  async softDelete(id: string, userId: number) {
    return db
      .update(aiTask)
      .set({ deletedAt: new Date() })
      .where(and(eq(aiTask.id, id), eq(aiTask.userId, userId), isNull(aiTask.deletedAt)));
  }
}

export const libRepository = new LibRepository();
