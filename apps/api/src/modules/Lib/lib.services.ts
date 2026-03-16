import { aiTask, and, desc, eq, sql } from '@zeroDraw/db';
import { isNull } from 'drizzle-orm';
import { db } from '../../db';
import { DeleteOutputParams, GetOutputsParams } from './lib.type';

class LibService {
  async getOutputs({ userId, page, pageSize, keyword, projectId }: GetOutputsParams) {
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
        createdAt: aiTask.createdAt,
      })
      .from(aiTask)
      .where(baseWhere)
      .orderBy(desc(aiTask.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { list, total, page, pageSize };
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
