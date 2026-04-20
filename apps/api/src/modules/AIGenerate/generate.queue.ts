import { Job, Queue, Worker } from 'bullmq';
import { bullRedisConnection } from '../../redis';
import { generateRepository } from './generate.repository';
import { logger } from '../../utils/logger';
import { r2Service } from '../R2/r2.services';
import { GenerateParams } from './generators/base.generator';
import { generatorFactory } from './generators/factory';

export interface GenerateJobData {
  taskId: string;
  params: GenerateParams;
}

class GenerateQueue {
  private readonly QUEUE_NAME = 'ai-generate';
  private readonly CONCURRENCY = 16;

  private queue: Queue<GenerateJobData>;
  private worker: Worker<GenerateJobData> | null = null;

  constructor() {
    this.queue = new Queue<GenerateJobData>(this.QUEUE_NAME, {
      connection: bullRedisConnection,
      defaultJobOptions: {
        attempts: 1,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: {
          age: 24 * 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
        },
      },
    });
  }

  /** 添加任务到队列 */
  async add(jobName: string, data: GenerateJobData, jobId: string) {
    return this.queue.add(jobName, data, { jobId });
  }

  /** 启动 Worker */
  start() {
    this.worker = new Worker<GenerateJobData>(this.QUEUE_NAME, (job) => this.process(job), {
      connection: bullRedisConnection,
      concurrency: this.CONCURRENCY,
    });

    this.worker.on('failed', (job, err) => this.onFailed(job, err));
    this.worker.on('error', (err) => logger.error('[Worker] Worker error', err));

    logger.info('[Worker] AI generate worker started', { concurrency: this.CONCURRENCY });
  }

  async close() {
    if (this.worker) {
      await this.worker.close();
      logger.info('[Worker] AI generate worker stopped');
    }
    await this.queue.close();
  }

  /** 处理单个任务 */
  private async process(job: Job<GenerateJobData>) {
    const { taskId, params } = job.data;

    logger.info(`[Worker] Processing task ${taskId}`, {
      action: params.action,
      attempt: job.attemptsMade + 1,
    });

    await generateRepository.updateById(taskId, { status: 'processing' });

    // 使用工厂模式获取对应的生成器
    const generator = generatorFactory.getGenerator(params.action);

    // 调用生成器生成图片
    const generateResult = await generator.generate(params);

    // 下载图片并上传到 S3
    const imageRes = await fetch(generateResult.imageUrl);
    const contentType =
      imageRes.headers.get('content-type') || generateResult.contentType || 'image/png';
    const ext = contentType.includes('jpeg') ? '.jpg' : '.png';
    const imageBuffer = await imageRes.arrayBuffer();
    const s3Key = await r2Service.uploadFile(Buffer.from(imageBuffer), contentType);

    // 更新任务状态
    await generateRepository.updateById(taskId, {
      status: 'completed',
      output: generateResult.rawResponse,
      s3Key,
    });

    logger.info(`[Worker] Task ${taskId} completed`, { action: params.action });

    return generateResult.rawResponse;
  }

  /** 任务失败回调 */
  private async onFailed(job: Job<GenerateJobData> | undefined, err: Error) {
    if (!job) return;

    const { taskId } = job.data;
    const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);

    logger.error(`[Worker] Task ${taskId} failed (attempt ${job.attemptsMade})`, err);

    if (isFinalAttempt) {
      await db
        .update(aiTask)
        .set({ status: 'failed', error: err.message || 'Unknown error' })
        .where(eq(aiTask.id, taskId));

      logger.error(`[Worker] Task ${taskId} permanently failed`, err);
    }
  }
}

export const generateQueue = new GenerateQueue();
