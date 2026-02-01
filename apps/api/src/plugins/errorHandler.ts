import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { createErrorResponse, ResponseCode, ResponseMessage } from '../types/response';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler(
    (error: FastifyError | AppError, request: FastifyRequest, reply: FastifyReply) => {
      logger.error('Error occurred', error, {
        url: request.url,
        method: request.method,
      });

      if (error instanceof AppError) {
        return reply.status(error.statusCode).send(createErrorResponse(error.code, error.message));
      }

      // 处理 Fastify 原生错误
      const statusCode = error.statusCode || 500;
      const code = statusCode * 10; // 将 HTTP 状态码转换为 4 位数错误码（如 500 -> 5000）
      const message =
        env.NODE_ENV === 'production' ? ResponseMessage.INTERNAL_SERVER_ERROR : error.message;

      return reply.status(statusCode).send(createErrorResponse(code, message));
    }
  );

  app.setNotFoundHandler((_request, reply) => {
    return reply
      .status(404)
      .send(createErrorResponse(ResponseCode.NOT_FOUND, ResponseMessage.NOT_FOUND));
  });
}
