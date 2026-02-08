import { SeedreamGenerateParams } from '@zeroDraw/api-contract';
import { aiTask, eq } from '@zeroDraw/db';
import { randomUUID } from 'crypto';
import { db } from '../../db';
import { redis } from '../../redis';
import { NotFoundError } from '../../utils/errors';
import { generateQueue } from './generate.queue';

class GenerateService {
  private readonly TASK_CACHE_PREFIX = 'ai-task:';
  private readonly TASK_CACHE_TTL = 60 * 60; // 1 小时

  async run(userId: number, params: SeedreamGenerateParams) {
    const taskId = randomUUID();

    const insertArgs = {
      ...params.args,
      image: params.s3Key,
    };
    await db.insert(aiTask).values({
      id: taskId,
      userId,
      action: params.action,
      status: 'pending',
      args: insertArgs,
    });

    await generateQueue.add(params.action, { taskId, params }, taskId);

    return { taskId };
  }

  async getTask(taskId: string, userId: number) {
    const cached = await redis.get(`${this.TASK_CACHE_PREFIX}${taskId}`);
    if (cached) {
      const data = JSON.parse(cached);
      if (data.userId !== userId) {
        throw new NotFoundError('Task not found');
      }
      return data;
    }

    const [task] = await db.select().from(aiTask).where(eq(aiTask.id, taskId));

    if (!task || task.userId !== userId) {
      throw new NotFoundError('Task not found');
    }

    const result = {
      id: task.id,
      userId: task.userId,
      action: task.action,
      status: task.status,
      error: task.error,
      createdAt: task.createdAt,
      s3Key: task.s3Key,
      args: task.args,
    };

    if (task.status === 'completed' || task.status === 'failed') {
      await redis.set(
        `${this.TASK_CACHE_PREFIX}${taskId}`,
        JSON.stringify(result),
        'EX',
        this.TASK_CACHE_TTL
      );
    }

    return result;
  }
}

export const generateService = new GenerateService();
