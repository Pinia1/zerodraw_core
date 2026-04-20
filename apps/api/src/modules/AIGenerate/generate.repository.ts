import { aiTask, eq, sql } from '@zeroDraw/db';
import { InferInsertModel } from 'drizzle-orm';
import { db } from '../../db';

interface CreateTaskParams {
  id: string;
  userId: number;
  action: string;
  args: Record<string, unknown>;
}

class GenerateRepository {
  async create({ id, userId, action, args }: CreateTaskParams) {
    await db.insert(aiTask).values({ id, userId, action, status: 'pending', args });
  }

  async updateById(taskId: string, data: Partial<Pick<InferInsertModel<typeof aiTask>, 'status' | 'error' | 's3Key' | 'output'>>) {
    await db.update(aiTask).set(data).where(eq(aiTask.id, taskId));
  }

  async findById(taskId: string) {
    const [row] = await db
      .select({
        id: aiTask.id,
        userId: aiTask.userId,
        action: aiTask.action,
        status: aiTask.status,
        error: aiTask.error,
        s3Key: aiTask.s3Key,
        args: aiTask.args,
        createdAt: sql<number>`UNIX_TIMESTAMP(${aiTask.createdAt}) * 1000`,
      })
      .from(aiTask)
      .where(eq(aiTask.id, taskId));
    return row ?? null;
  }
}

export const generateRepository = new GenerateRepository();
