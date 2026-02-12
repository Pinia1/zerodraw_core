import { aiTask, desc, sql } from '@zeroDraw/db';
import { db } from '../../db';
import { GetOutputsParams } from './lib.type';

class LibService {
  async getOutputs({ userId, page, pageSize, keyword }: GetOutputsParams) {
    const offset = (page - 1) * pageSize;

    const baseWhere = keyword
      ? sql`${aiTask.userId} = ${userId} AND ${aiTask.s3Key} IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(${aiTask.args}, '$.prompt')) LIKE ${'%' + keyword + '%'}`
      : sql`${aiTask.userId} = ${userId} AND ${aiTask.s3Key} IS NOT NULL`;

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
}

export const libService = new LibService();
