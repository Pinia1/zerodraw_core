import { Job, Queue, Worker } from 'bullmq';
import { bullRedisConnection } from '../../redis';
import { logger } from '../../utils/logger';
import { uploadServices } from '../Volc';
import { generateRepository } from './generate.repository';
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

  async add(jobName: string, data: GenerateJobData, jobId: string) {
    return this.queue.add(jobName, data, { jobId });
  }

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

  private async fetchWithRetry(url: string, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url);
        if (res.ok) return res;
      } catch {}
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
    throw new Error('fetch image error');
  }

  private async process(job: Job<GenerateJobData>) {
    const { taskId, params } = job.data;

    logger.info(`[Worker] Processing task ${taskId}`, {
      action: params.action,
      attempt: job.attemptsMade + 1,
    });

    await generateRepository.updateById(taskId, { status: 'processing' });

    const generator = generatorFactory.getGenerator(params.action);

    const generateResult = await generator.generate(params);

    const imageRes = await this.fetchWithRetry(generateResult.imageUrl);
    const contentType =
      imageRes.headers.get('content-type') || generateResult.contentType || 'image/png';
    const imageBuffer = await imageRes.arrayBuffer();
    const s3Key = await uploadServices.uploadFile(Buffer.from(imageBuffer), contentType);

    await generateRepository.updateById(taskId, {
      status: 'completed',
      output: generateResult.rawResponse,
      s3Key,
    });

    logger.info(`[Worker] Task ${taskId} completed`, { action: params.action });

    return generateResult.rawResponse;
  }

  private async onFailed(job: Job<GenerateJobData> | undefined, err: Error) {
    if (!job) return;

    const { taskId } = job.data;
    const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);

    logger.error(`[Worker] Task ${taskId} failed (attempt ${job.attemptsMade})`, err);

    if (isFinalAttempt) {
      await generateRepository.updateById(taskId, {
        status: 'failed',
        error: err.message || 'Unknown error',
      });

      logger.error(`[Worker] Task ${taskId} permanently failed`, err);
    }
  }
}

export const generateQueue = new GenerateQueue();
