import { ZodTypeProvider } from '@fastify/type-provider-zod';
import {
  assetListQuerySchema,
  createBrushSchema,
  createColorSchema,
  createImageSchema,
  createPaletteSchema,
  createPromptSchema,
  updateBrushSchema,
  updateColorSchema,
  updatePaletteSchema,
  updatePromptSchema,
} from '@zeroDraw/api-contract';
import { FastifyInstance } from 'fastify';
import { authenticate } from '../Auth/auth.middleware';
import { assetsService } from './assets.services';
import { favoriteBody, idParam } from './type';

export async function assetsRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.addHook('onRequest', authenticate);

  app.get('/list', { schema: { querystring: assetListQuerySchema } }, async (request, reply) => {
    const data = await assetsService.listAll({ userId: request.user.userId, ...request.query });
    return reply.success(data);
  });

  app.get('/colors', { schema: { querystring: assetListQuerySchema } }, async (request, reply) => {
    const data = await assetsService.listColors({ userId: request.user.userId, ...request.query });
    return reply.success(data);
  });

  app.post('/colors', { schema: { body: createColorSchema } }, async (request, reply) => {
    const data = await assetsService.createColor({ userId: request.user.userId, ...request.body });
    return reply.success(data);
  });

  app.put(
    '/colors/:id',
    { schema: { params: idParam, body: updateColorSchema } },
    async (request, reply) => {
      const data = await assetsService.updateColor({
        id: request.params.id,
        userId: request.user.userId,
        ...request.body,
      });
      return reply.success(data);
    }
  );

  app.delete('/colors/:id', { schema: { params: idParam } }, async (request, reply) => {
    await assetsService.deleteColor({ id: request.params.id, userId: request.user.userId });
    return reply.success(null);
  });

  app.get(
    '/palettes',
    { schema: { querystring: assetListQuerySchema } },
    async (request, reply) => {
      const data = await assetsService.listPalettes({
        userId: request.user.userId,
        ...request.query,
      });
      return reply.success(data);
    }
  );

  app.post('/palettes', { schema: { body: createPaletteSchema } }, async (request, reply) => {
    const data = await assetsService.createPalette({
      userId: request.user.userId,
      ...request.body,
    });
    return reply.success(data);
  });

  app.put(
    '/palettes/:id',
    { schema: { params: idParam, body: updatePaletteSchema } },
    async (request, reply) => {
      await assetsService.updatePalette({
        id: request.params.id,
        userId: request.user.userId,
        ...request.body,
      });
      return reply.success(request.params.id);
    }
  );

  app.delete('/palettes/:id', { schema: { params: idParam } }, async (request, reply) => {
    await assetsService.deletePalette({ id: request.params.id, userId: request.user.userId });
    return reply.success(null);
  });

  app.get('/images', { schema: { querystring: assetListQuerySchema } }, async (request, reply) => {
    const data = await assetsService.listImages({ userId: request.user.userId, ...request.query });
    return reply.success(data);
  });

  app.post('/images', { schema: { body: createImageSchema } }, async (request, reply) => {
    const data = await assetsService.createImage({ userId: request.user.userId, ...request.body });
    return reply.success(data);
  });

  app.delete('/images/:id', { schema: { params: idParam } }, async (request, reply) => {
    await assetsService.deleteImage({ id: request.params.id, userId: request.user.userId });
    return reply.success(null);
  });

  app.get('/prompts', { schema: { querystring: assetListQuerySchema } }, async (request, reply) => {
    const data = await assetsService.listPrompts({ userId: request.user.userId, ...request.query });
    return reply.success(data);
  });

  app.post('/prompts', { schema: { body: createPromptSchema } }, async (request, reply) => {
    const data = await assetsService.createPrompt({ userId: request.user.userId, ...request.body });
    return reply.success(data);
  });

  app.put(
    '/prompts/:id',
    { schema: { params: idParam, body: updatePromptSchema } },
    async (request, reply) => {
      await assetsService.updatePrompt({
        id: request.params.id,
        userId: request.user.userId,
        ...request.body,
      });
      return reply.success(request.params.id);
    }
  );

  app.patch(
    '/prompts/:id/favorite',
    { schema: { params: idParam, body: favoriteBody } },
    async (request, reply) => {
      await assetsService.toggleFavoritePrompt({
        id: request.params.id,
        userId: request.user.userId,
        isFavorite: request.body.isFavorite,
      });
      return reply.success(null);
    }
  );

  app.delete('/prompts/:id', { schema: { params: idParam } }, async (request, reply) => {
    await assetsService.deletePrompt({ id: request.params.id, userId: request.user.userId });
    return reply.success(null);
  });

  app.get('/brushes', { schema: { querystring: assetListQuerySchema } }, async (request, reply) => {
    const data = await assetsService.listBrushes({ userId: request.user.userId, ...request.query });
    return reply.success(data);
  });

  app.post('/brushes', { schema: { body: createBrushSchema } }, async (request, reply) => {
    const data = await assetsService.createBrush({ userId: request.user.userId, ...request.body });
    return reply.success(data);
  });

  app.put(
    '/brushes/:id',
    { schema: { params: idParam, body: updateBrushSchema } },
    async (request, reply) => {
      await assetsService.updateBrush({
        id: request.params.id,
        userId: request.user.userId,
        ...request.body,
      });
      return reply.success(request.params.id);
    }
  );

  app.delete('/brushes/:id', { schema: { params: idParam } }, async (request, reply) => {
    await assetsService.deleteBrush({ id: request.params.id, userId: request.user.userId });
    return reply.success(null);
  });
}
