import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { redis } from '../../redis';
import { NotFoundError } from '../../utils/errors';
import type { BananaService } from '../NanoBanana/banana.services';
import type { R2Service } from '../R2/r2.services';
import type { GenerateQueue } from './generate.queue';
import type { GenerateRepository } from './generate.repository';
import { GenerateParams } from './generators/base.generator';

export class GenerateService {
  private readonly TASK_CACHE_PREFIX = 'ai-task:';
  private readonly TASK_CACHE_TTL = 60 * 60;

  constructor(
    private readonly generateRepository: GenerateRepository,
    private readonly generateQueue: GenerateQueue,
    private readonly bananaService: BananaService,
    private readonly r2Service: R2Service,
  ) {}

  async run(userId: number, params: GenerateParams) {
    const taskId = randomUUID();
    const args = { ...params.args, image: params.s3Key };
    await this.generateRepository.create({ id: taskId, userId, action: params.action, args });

    if (env.SERVER_BASE_URL) {
      const webhookUrl = `${env.SERVER_BASE_URL}/api/generate/webhook/${taskId}`;
      const result = await this.bananaService.generate(params as any, webhookUrl);
      if (result.code !== 0) {
        await this.generateRepository.updateById(taskId, { status: 'failed', error: result.msg });
      } else {
        await this.generateRepository.updateById(taskId, { status: 'processing' });
      }
    } else {
      await this.generateQueue.add(params.action, { taskId, params }, taskId);
    }

    return { taskId };
  }

  async handleWebhook(taskId: string, payload: any) {
    const { status, results } = payload.data ?? {};
    if (status === 'succeeded') {
      const imageUrl = results?.[0]?.url;
      if (!imageUrl) return;

      const imageRes = await fetch(imageUrl);
      const contentType = imageRes.headers.get('content-type') || 'image/png';
      const buffer = Buffer.from(await imageRes.arrayBuffer());
      const s3Key = await this.r2Service.uploadFile(buffer, contentType);

      await this.generateRepository.updateById(taskId, { status: 'completed', s3Key });
      await redis.del(`${this.TASK_CACHE_PREFIX}${taskId}`);
    } else if (status === 'failed') {
      await this.generateRepository.updateById(taskId, { status: 'failed', error: 'Generation failed' });
    }
  }

  async getTask(taskId: string, userId: number) {
    const cached = await redis.get(`${this.TASK_CACHE_PREFIX}${taskId}`);
    if (cached) {
      const data = JSON.parse(cached);
      if (data.userId !== userId) throw new NotFoundError('Task not found');
      return data;
    }

    const task = await this.generateRepository.findById(taskId);
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
        this.TASK_CACHE_TTL,
      );
    }

    return result;
  }
}
