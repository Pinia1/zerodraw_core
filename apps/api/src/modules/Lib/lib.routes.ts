import { paginationQuerySchema } from '@zeroDraw/api-contract';
import { aiTask, desc, sql } from '@zeroDraw/db';
import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { createSuccessResponse } from '../../types/response';
import { authenticate } from '../Auth/auth.middleware';

export async function libRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate);

  app.get('/outputs', async (request, reply) => {
    const queryResult = paginationQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.code(400).send({ message: 'Invalid query parameters' });
    }

    const { page, pageSize } = queryResult.data;
    const userId = request.user.userId;
    const offset = (page - 1) * pageSize;

    // 查询总数
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiTask)
      .where(sql`${aiTask.userId} = ${userId} AND ${aiTask.s3Key} IS NOT NULL`);

    const total = Number(countResult?.count ?? 0);

    // 查询列表数据
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
      .where(sql`${aiTask.userId} = ${userId} AND ${aiTask.s3Key} IS NOT NULL`)
      .orderBy(desc(aiTask.createdAt))
      .limit(pageSize)
      .offset(offset);

    return reply.send(
      createSuccessResponse({
        list: list.map((item) => ({
          ...item,
          createdAt: item.createdAt?.toISOString() ?? '',
        })),
        total,
        page,
        pageSize,
      })
    );
  });
}
