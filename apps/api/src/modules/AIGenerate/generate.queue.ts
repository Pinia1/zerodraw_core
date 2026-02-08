import { SeedreamGenerateParams } from '@zeroDraw/api-contract';
import { aiTask, eq } from '@zeroDraw/db';
import { Job, Queue, Worker } from 'bullmq';
import { db } from '../../db';
import { bullRedisConnection } from '../../redis';
import { logger } from '../../utils/logger';
import { seedreamService } from '../Seedream/seedream.services';

export interface GenerateJobData {
  taskId: string;
  params: SeedreamGenerateParams;
}

class GenerateQueue {
  private readonly QUEUE_NAME = 'ai-generate';
  private readonly CONCURRENCY = 3;

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
          age: 24 * 3600, // 完成的任务保留 24h
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // 失败的任务保留 7 天
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
    this.worker = new Worker<GenerateJobData>(
      this.QUEUE_NAME,
      (job) => this.process(job),
      {
        connection: bullRedisConnection,
        concurrency: this.CONCURRENCY,
      },
    );

    this.worker.on('failed', (job, err) => this.onFailed(job, err));
    this.worker.on('error', (err) => logger.error('[Worker] Worker error', err));

    logger.info('[Worker] AI generate worker started', { concurrency: this.CONCURRENCY });
  }

  /** 关闭队列和 Worker */
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
      type: params.action,
      attempt: job.attemptsMade + 1,
    });

    // 更新状态为 processing
    await db.update(aiTask).set({ status: 'processing' }).where(eq(aiTask.id, taskId));

    // 调用实际生成服务
    const result = await seedreamService.generate(params);

    // 成功 → 写入结果
    await db
      .update(aiTask)
      .set({ status: 'completed', output: result })
      .where(eq(aiTask.id, taskId));

    logger.info(`[Worker] Task ${taskId} completed`);

    return result;
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
