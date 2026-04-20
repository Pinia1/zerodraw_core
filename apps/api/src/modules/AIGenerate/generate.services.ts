import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { redis } from '../../redis';
import { NotFoundError } from '../../utils/errors';
import { bananaService } from '../NanoBanana/banana.services';
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

    if (env.SERVER_BASE_URL) {
      const webhookUrl = `${env.SERVER_BASE_URL}/api/generate/webhook/${taskId}`;
      const result = await bananaService.generate(params as any, webhookUrl);
      if (result.code !== 0) {
        await generateRepository.updateById(taskId, { status: 'failed', error: result.msg });
      } else {
        await generateRepository.updateById(taskId, { status: 'processing' });
      }
    } else {
      await generateQueue.add(params.action, { taskId, params }, taskId);
    }

    return { taskId };
  }

  async handleWebhook(taskId: string, payload: any) {
    const { status, results } = payload.data ?? {};
    if (status === 'succeeded') {
      const imageUrl = results?.[0]?.url;
      if (!imageUrl) return;

      const { r2Service } = await import('../R2/r2.services');
      const imageRes = await fetch(imageUrl);
      const contentType = imageRes.headers.get('content-type') || 'image/png';
      const buffer = Buffer.from(await imageRes.arrayBuffer());
      const s3Key = await r2Service.uploadFile(buffer, contentType);

      await generateRepository.updateById(taskId, { status: 'completed', s3Key });
      await redis.del(`${this.TASK_CACHE_PREFIX}${taskId}`);
    } else if (status === 'failed') {
      await generateRepository.updateById(taskId, { status: 'failed', error: 'Generation failed' });
    }
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
