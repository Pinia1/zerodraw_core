import { FastifyReply, FastifyRequest } from 'fastify';
import { getRedis } from '../redis';
import { TooManyRequestsError } from '../utils/errors';

interface UserRateLimitOptions {
  max: number;
  windowSec: number;
  keyPrefix?: string;
}

export function userRateLimit({ max, windowSec, keyPrefix = 'rl' }: UserRateLimitOptions) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const redis = getRedis();
    if (!redis) return;

    const userId = request.user.userId;
    const key = `${keyPrefix}:${userId}`;

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSec);
    }

    reply.header('X-RateLimit-Limit', String(max));
    reply.header('X-RateLimit-Remaining', String(Math.max(0, max - current)));

    if (current > max) {
      const ttl = await redis.ttl(key);
      reply.header('X-RateLimit-Reset', String(ttl));
      throw new TooManyRequestsError();
    }
  };
}
