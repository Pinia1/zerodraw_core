import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod';
import fastify from 'fastify';
import { generateQueue } from './modules/AIGenerate/generate.queue';
import responseWrapper from './plugins/response-wrapper';
import { registerRoutes } from './routes';

export async function createApp() {
  const app = fastify({
    logger: false,
    trustProxy: true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  generateQueue.start();

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 10MB
    },
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
  });

  await app.register(responseWrapper);
  await registerRoutes(app);

  app.addHook('onRequest', async (request, reply) => {
    request.log.info({
      method: request.method,
      url: request.url,
      headers: request.headers,
    });
  });

  return app;
}
