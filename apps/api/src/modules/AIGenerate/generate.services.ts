import { randomUUID } from 'crypto';
import { redis } from '../../redis';
import { NotFoundError } from '../../utils/errors';
import { generateQueue } from './generate.queue';
import { generateRepository } from './generate.repository';
import { GenerateParams } from './generators/base.generator';

class GenerateService {
  private readonly TASK_CACHE_PREFIX = 'ai-task:';
  private readonly TASK_CACHE_TTL = 60 * 60;

  async run(userId: number, params: GenerateParams) {
    const taskId = randomUUID();
    const args = { ...params.args, image: params.s3Key };

    await generateRepository.create({ id: taskId, userId, action: params.action, args });
    await generateQueue.add(params.action, { taskId, params }, taskId);

    return { taskId };
  }

  async getTask(taskId: string, userId: number) {
    const cached = await redis.get(`${this.TASK_CACHE_PREFIX}${taskId}`);
    if (cached) {
      const data = JSON.parse(cached);
      if (data.userId !== userId) throw new NotFoundError('Task not found');
      return data;
    }

    const task = await generateRepository.findById(taskId);
    if (!task || task.userId !== userId) throw new NotFoundError('Task not found');

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
