import { FastifyReply } from 'fastify';

interface StreamHeaders {
  [key: string]: string | undefined;
}

/**
 * 设置文件流响应头并发送流
 * @param reply Fastify reply 对象
 * @param stream 可读流
 * @param headers 来源响应头（如 TOS 返回的 headers）
 * @param cacheMaxAge 缓存时间（秒），默认 86400（1天）
 */
export function sendStream(
  reply: FastifyReply,
  stream: NodeJS.ReadableStream,
  headers: StreamHeaders,
  cacheMaxAge = 86400
) {
  if (headers['content-type']) {
    reply.header('Content-Type', headers['content-type']);
  }
  if (headers['content-length']) {
    reply.header('Content-Length', headers['content-length']);
  }
  reply.header('Cache-Control', `public, max-age=${cacheMaxAge}`);

  return reply.send(stream);
}
