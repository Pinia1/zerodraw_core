import { aiTask, eq, sql } from '@zeroDraw/db';
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
