import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../config/env';
import { BananaService } from '../modules/NanoBanana/banana.services';
import { GithubService } from '../modules/Passport/github.service';
import { R2Service } from '../modules/R2/r2.services';
import { SeedreamService } from '../modules/Seedream/seedream.services';
import { VolcService } from '../modules/Volc/volc.services';

export interface UploadServices {
  uploadFile: (buffer: Buffer, contentType: string) => Promise<string>;
}

export function createUploadServices(
  r2Service: R2Service,
  volcService: VolcService
): UploadServices {
  const provider = env.NODE_ENV === 'development' ? 'volc' : env.UPLOAD_PROVIDER;
  return provider === 'r2' ? r2Service : volcService;
}

async function infraPluginImpl(fastify: FastifyInstance): Promise<void> {
  const r2Service = new R2Service();
  const volcService = new VolcService();
  const uploadServices = createUploadServices(r2Service, volcService);
  const githubService = new GithubService();
  const bananaService = new BananaService(volcService);
  const seedreamService = new SeedreamService(volcService);

  fastify.decorate('r2Service', r2Service);
  fastify.decorate('volcService', volcService);
  fastify.decorate('uploadServices', uploadServices);
  fastify.decorate('githubService', githubService);
  fastify.decorate('bananaService', bananaService);
  fastify.decorate('seedreamService', seedreamService);
}

export const infraPlugin = fp(infraPluginImpl, {
  name: '@zeroDraw/infra',
  fastify: '5.x',
});
