import { FastifyInstance } from 'fastify';
import { createSuccessResponse } from '../../types/response';
import { BadRequestError } from '../../utils/errors';
import { authenticate } from '../Auth/auth.middleware';
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
    if (!key) {
      throw new BadRequestError();
    }
    const url = volcService.getSignedUrl(key);
    return reply.redirect(url);
  });

  app.get('/thumbnail/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    if (!key) {
      throw new BadRequestError();
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
