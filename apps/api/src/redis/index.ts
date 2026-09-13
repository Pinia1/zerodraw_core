import Redis from 'ioredis';
import { env, isRedisEnabled } from '../config/env';
import { logger } from '../utils/logger';

let redis: Redis | undefined;

export function getRedis(): Redis | undefined {
  if (!isRedisEnabled) return undefined;
  if (!redis) {
    redis = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      db: env.REDIS_DB,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy(times) {
        return Math.min(times * 200, 5000);
      },
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
    });
  }
  return redis;
}

export const closeRedis = async () => {
  if (redis) {
    await redis.quit();
    redis = undefined;
  }
};
