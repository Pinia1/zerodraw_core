import { FastifyInstance } from 'fastify';
import { env } from '../../config/env';
import { createSuccessResponse } from '../../types/response';
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
    return reply.send(createSuccessResponse(key));
  });

  app.get('/s3/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    if (!key) throw new BadRequestError();
    if (key.startsWith('$')) {
      return reply.redirect(`${env.R2_PUBLIC_URL}/${key}`);
    }
    const url = volcService.getSignedUrl(key);
    return reply.redirect(url);
  });

  app.get('/thumbnail/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    if (!key) throw new BadRequestError();
    if (key.startsWith('$')) {
      return reply.redirect(`${env.R2_PUBLIC_URL}/cdn-cgi/image/width=400/${key}`);
    }
    const url = volcService.getSignedUrl(key, { process: 'image/resize,w_400' });
    return reply.redirect(url);
  });

  app.get('/volc/stream/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    if (!key) {
      throw new BadRequestError();
    }
    const { stream } = await volcService.getFileStream(key, 'image/format,png');
    reply.header('Content-Type', 'image/png');
    return reply.send(stream);
  });

  app.get('/url/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    if (!key) {
      throw new BadRequestError();
    }
    const url = volcService.getSignedUrl(key);
    return reply.send(createSuccessResponse(url));
  });
}
