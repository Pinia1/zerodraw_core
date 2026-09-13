import { ZodTypeProvider } from '@fastify/type-provider-zod';
import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import { z } from 'zod';
import { env } from '../../config/env';
import { BadRequestError, NotFoundError } from '../../utils/errors';

export async function fileRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post('/upload', { preHandler: fastify.authenticate }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      throw new BadRequestError();
    }
    const buffer = await file.toBuffer();
    const key = await fastify.uploadServices.uploadFile(buffer, file.mimetype);
    return reply.success(key);
  });

  app.get(
    '/local/:key',
    { schema: { params: z.object({ key: z.string() }) } },
    async (request, reply) => {
      const { key } = request.params;
      const filePath = fastify.localStorage.resolvePath(key);
      if (!fs.existsSync(filePath)) {
        throw new NotFoundError();
      }
      return reply.send(fs.createReadStream(filePath));
    },
  );

  app.get(
    '/s3/:key',
    { schema: { params: z.object({ key: z.string() }) } },
    async (request, reply) => {
      const { key } = request.params;
      if (key.startsWith('$')) {
        return reply.redirect(`${env.R2_PUBLIC_URL}/${key}`);
      }
      if (!fastify.volcService) {
        return reply.redirect(fastify.localStorage.getPublicPath(key));
      }
      const url = fastify.volcService.getSignedUrl(key);
      return reply.redirect(url);
    },
  );

  app.get(
    '/thumbnail/:key',
    { schema: { params: z.object({ key: z.string() }) } },
    async (request, reply) => {
      const { key } = request.params;
      if (key.startsWith('$')) {
        return reply.redirect(`${env.R2_PUBLIC_URL}/cdn-cgi/image/width=400/${key}`);
      }
      if (!fastify.volcService) {
        return reply.redirect(fastify.localStorage.getPublicPath(key));
      }
      const url = fastify.volcService.getSignedUrl(key, { process: 'image/resize,w_400' });
      return reply.redirect(url);
    },
  );

  app.get(
    '/volc/stream/:key',
    { schema: { params: z.object({ key: z.string() }) } },
    async (request, reply) => {
      const { key } = request.params;
      if (!fastify.volcService) {
        throw new NotFoundError();
      }
      const { stream } = await fastify.volcService.getFileStream(key, 'image/format,png');
      reply.header('Content-Type', 'image/png');
      return reply.send(stream);
    },
  );

  app.get(
    '/url/:key',
    { schema: { params: z.object({ key: z.string() }) } },
    async (request, reply) => {
      const { key } = request.params;
      if (!fastify.volcService) {
        return reply.success(fastify.localStorage.getPublicPath(key));
      }
      const url = fastify.volcService.getSignedUrl(key);
      return reply.success(url);
    },
  );
}
