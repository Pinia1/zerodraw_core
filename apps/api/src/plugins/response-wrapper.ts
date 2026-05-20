import { FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

interface ResponseWrapper {
  data: unknown;
  message: string | null;
  code: number;
}

/**
 * 将 HTTP 状态码转换为 4 位数业务代码
 * @param httpCode HTTP 状态码
 * @returns 4 位数业务代码
 */
function httpCodeToBusinessCode(httpCode: number): number {
  if (httpCode >= 400 && httpCode < 500) {
    return 4000 + (httpCode % 100);
  } else if (httpCode >= 500) {
    return 5000 + (httpCode % 100);
  }
  return 1000;
}

function wrapResponse(data: unknown, code = 1000, message: string | null = null): ResponseWrapper {
  return {
    data,
    message,
    code,
  };
}

const responseWrapperPlugin: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.decorateReply('success', function (data: unknown, message: string | null = null) {
    return this.send(wrapResponse(data, 1000, message));
  });

  fastify.decorateReply('fail', function (code: number, message: string, data: unknown = null) {
    return this.send(wrapResponse(data, code, message));
  });

  fastify.addHook(
    'onSend',
    async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
      const path = request.url;
      if (path.startsWith('/docs')) {
        return payload;
      }

      const contentType = (reply.getHeader('Content-Type') as string) ?? '';
      if (contentType && !contentType.includes('application/json')) {
        return payload;
      }

      let data: unknown = payload;
      if (typeof payload === 'string') {
        try {
          data = JSON.parse(payload);
        } catch {
          data = payload;
        }
      }

      if (
        data &&
        typeof data === 'object' &&
        'data' in data &&
        'message' in data &&
        'code' in data
      ) {
        return payload;
      }

      const statusCode = reply.statusCode;
      if (statusCode >= 400) {
        const businessCode = httpCodeToBusinessCode(statusCode);
        return JSON.stringify(
          wrapResponse(null, businessCode, typeof data === 'string' ? data : 'Request failed')
        );
      }

      return JSON.stringify(wrapResponse(data, 1000, null));
    }
  );

  fastify.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    request.log.error(error);

    const statusCode = error.statusCode || 500;
    const businessCode = httpCodeToBusinessCode(statusCode);
    const message = error.message || 'Internal Server Error';

    reply.status(statusCode).send(wrapResponse(null, businessCode, message));
  });

  done();
};

export default fp(responseWrapperPlugin, {
  name: 'response-wrapper',
});

declare module 'fastify' {
  interface FastifyReply {
    success(data: unknown, message?: string | null): FastifyReply;
    fail(code: number, message: string, data?: unknown): FastifyReply;
  }
}
