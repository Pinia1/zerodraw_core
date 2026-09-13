import cors from '@fastify/cors';

import helmet from '@fastify/helmet';

import jwt from '@fastify/jwt';

import multipart from '@fastify/multipart';

import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod';

import { agentPlugin } from '@zeroDraw/agent';

import fastify from 'fastify';

import { buildAgentModuleConfig } from './agent/setup';

import { generatePlugin } from './modules/AIGenerate/plugin';

import { assetsPlugin } from './modules/Assets/plugin';

import { authPlugin } from './modules/Auth/plugin';

import { filePlugin } from './modules/File/plugin';

import { libPlugin } from './modules/Lib/plugin';

import { projectPlugin } from './modules/Project/plugin';

import { infraPlugin } from './plugins/infra.plugin';

import responseWrapper from './plugins/response-wrapper';

import { registerRoutes } from './routes';



export async function createApp() {

  const app = fastify({

    logger: false,

    trustProxy: true,

  });



  app.setValidatorCompiler(validatorCompiler);

  app.setSerializerCompiler(serializerCompiler);



  await app.register(cors, {

    origin: true,

    credentials: true,

    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  });



  await app.register(multipart, {

    limits: {

      fileSize: 50 * 1024 * 1024,

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



  await app.register(infraPlugin);

  await app.register(authPlugin);

  await app.register(projectPlugin);

  await app.register(generatePlugin);

  await app.register(libPlugin);

  await app.register(assetsPlugin);

  await app.register(filePlugin);



  await app.register(agentPlugin, {
    config: (fastify) => buildAgentModuleConfig(fastify),
    routePrefix: '/api/agent',
  });



  await registerRoutes(app);



  app.addHook('onRequest', async (request, _reply) => {

    request.log.info({

      method: request.method,

      url: request.url,

      headers: request.headers,

    });

  });



  return app;

}

