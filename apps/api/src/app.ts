import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import fastify from 'fastify';
import { errorHandler } from './plugins/errorHandler';
import { registerRoutes } from './routes';

export async function createApp() {
  const app = fastify({
    logger: false,
    trustProxy: true,
  });

  await app.register(cors);

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
  });

  await errorHandler(app);

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
