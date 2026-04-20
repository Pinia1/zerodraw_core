import { FastifyInstance } from 'fastify';
import { env } from '../../config/env';
import { createSuccessResponse } from '../../types/response';
import { BadRequestError } from '../../utils/errors';
import { authenticate } from '../Auth/auth.middleware';
import { r2Service } from '../R2/r2.services';
import { volcService } from '../Volc/volc.services';

export async function fileRoutes(app: FastifyInstance) {
  app.post('/upload', { preHandler: authenticate }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      throw new BadRequestError();
    }
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestError('Unsupported file type');
    }
    const buffer = await file.toBuffer();
    const result = await volcService.uploadFile(buffer, file.filename, file.mimetype);
    return reply.send(createSuccessResponse(result));
  });

  app.get('/volc/:key', async (request, reply) => {
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

  app.post('/r2/presign', { preHandler: authenticate }, async (request, reply) => {
    const { contentType } = request.body as { contentType: string };
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!ALLOWED_TYPES.includes(contentType)) {
      throw new BadRequestError('Unsupported file type');
    }
    const key = r2Service.generateObjectKey();
    const uploadUrl = await r2Service.getPresignedUploadUrl(key, contentType);
    return reply.send(createSuccessResponse({ key, uploadUrl }));
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
