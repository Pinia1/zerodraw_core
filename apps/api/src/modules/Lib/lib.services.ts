import { aiTask, and, desc, eq, sql } from '@zeroDraw/db';
import { gte, isNull, lte } from 'drizzle-orm';
import { db } from '../../db';
import { DeleteOutputParams, GetOutputsParams, GetRunningParams } from './lib.type';

class LibService {
  async getOutputs({ userId, page, pageSize, keyword, projectId, startDate, endDate }: GetOutputsParams) {
    const offset = (page - 1) * pageSize;

    // 构建基础查询条件
    const conditions = [
      eq(aiTask.userId, userId),
      sql`${aiTask.s3Key} IS NOT NULL`,
      isNull(aiTask.deletedAt),
    ];

    // 如果有关键词，添加模糊搜索
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

    if (startDate) {
      conditions.push(gte(aiTask.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(aiTask.createdAt, new Date(endDate)));
    }

    const baseWhere = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiTask)
      .where(baseWhere);

    const total = Number(countResult?.count ?? 0);

    const list = await db
      .select({
        id: aiTask.id,
        action: aiTask.action,
        status: aiTask.status,
        s3Key: aiTask.s3Key,
        args: aiTask.args,
        createdAt: sql<number>`UNIX_TIMESTAMP(${aiTask.createdAt}) * 1000`,
      })
      .from(aiTask)
      .where(baseWhere)
      .orderBy(desc(aiTask.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { list, total, page, pageSize };
  }

  async getRunning({ userId, action, projectId, startDate, endDate }: GetRunningParams) {
    const conditions = [
      eq(aiTask.userId, userId),
      sql`${aiTask.status} IN ('pending', 'processing')`,
      isNull(aiTask.deletedAt),
    ];

    if (action) {
      conditions.push(eq(aiTask.action, action));
    }

    if (projectId) {
      conditions.push(
        sql`JSON_UNQUOTE(JSON_EXTRACT(${aiTask.args}, '$.projectId')) = ${projectId}`
      );
    }

    if (startDate) {
      conditions.push(gte(aiTask.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(aiTask.createdAt, new Date(endDate)));
    }

    const list = await db
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

    return list;
  }

  async deleteOutput({ id, userId }: DeleteOutputParams) {
    const result = await db
      .update(aiTask)
      .set({ deletedAt: new Date() })
      .where(and(eq(aiTask.id, id), eq(aiTask.userId, userId), isNull(aiTask.deletedAt)));
    return result;
  }
}

export const libService = new LibService();
