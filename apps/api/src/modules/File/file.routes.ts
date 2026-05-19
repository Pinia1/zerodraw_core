import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env';
import { BadRequestError } from '../../utils/errors';
import { authenticate } from '../Auth/auth.middleware';
import { uploadServices } from '../Volc';
import { volcService } from '../Volc/volc.services';

export async function fileRoutes(app: FastifyInstance) {
  app.post('/upload', { preHandler: authenticate }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      throw new BadRequestError();
    }
    const buffer = await file.toBuffer();
    const key = await uploadServices.uploadFile(buffer, file.mimetype);
    return reply.success(key);
  });

  app.get<{ Params: { key: string } }>(
    '/s3/:key',
    { schema: { params: z.object({ key: z.string() }) } },
    async (request, reply) => {
      const { key } = request.params;
      if (key.startsWith('$')) {
        return reply.redirect(`${env.R2_PUBLIC_URL}/${key}`);
      }
      const url = volcService.getSignedUrl(key);
      return reply.redirect(url);
    }
  );

  app.get<{ Params: { key: string } }>(
    '/thumbnail/:key',
    { schema: { params: z.object({ key: z.string() }) } },
    async (request, reply) => {
      const { key } = request.params;
      if (key.startsWith('$')) {
        return reply.redirect(`${env.R2_PUBLIC_URL}/cdn-cgi/image/width=400/${key}`);
      }
      const url = volcService.getSignedUrl(key, { process: 'image/resize,w_400' });
      return reply.redirect(url);
    }
  );

  app.get<{ Params: { key: string } }>(
    '/volc/stream/:key',
    { schema: { params: z.object({ key: z.string() }) } },
    async (request, reply) => {
      const { key } = request.params;
      const { stream } = await volcService.getFileStream(key, 'image/format,png');
      reply.header('Content-Type', 'image/png');
      return reply.send(stream);
    }
  );

  app.get<{ Params: { key: string } }>(
    '/url/:key',
    { schema: { params: z.object({ key: z.string() }) } },
    async (request, reply) => {
      const { key } = request.params;
      const url = volcService.getSignedUrl(key);
      return reply.success(url);
    }
  );
}
