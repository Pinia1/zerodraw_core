import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { env, isCloudUploadEnabled } from '../config/env';
import { LocalStorageService } from '../modules/Local/local.storage';
import { GithubService } from '../modules/Passport/github.service';
import { R2Service } from '../modules/R2/r2.services';
import { VolcService } from '../modules/Volc/volc.services';

export interface UploadServices {
  uploadFile: (buffer: Buffer, contentType: string) => Promise<string>;
}

export function createUploadServices(
  localStorage: LocalStorageService,
  r2Service?: R2Service,
  volcService?: VolcService,
): UploadServices {
  if (env.UPLOAD_PROVIDER === 'local' || !isCloudUploadEnabled) {
    return localStorage;
  }
  if (env.UPLOAD_PROVIDER === 'r2' && r2Service) {
    return r2Service;
  }
  if (volcService) {
    return volcService;
  }
  return localStorage;
}

async function infraPluginImpl(fastify: FastifyInstance): Promise<void> {
  const localStorage = new LocalStorageService();
  const r2Service = env.CLOUDFLARE_ACCESS_KEY_ID ? new R2Service() : undefined;
  const volcService = isCloudUploadEnabled ? new VolcService() : undefined;
  const uploadServices = createUploadServices(localStorage, r2Service, volcService);
  const githubService =
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? new GithubService() : undefined;

  fastify.decorate('localStorage', localStorage);
  if (r2Service) fastify.decorate('r2Service', r2Service);
  if (volcService) fastify.decorate('volcService', volcService);
  fastify.decorate('uploadServices', uploadServices);
  if (githubService) fastify.decorate('githubService', githubService);
}

export const infraPlugin = fp(infraPluginImpl, {
  name: '@zeroDraw/infra',
  fastify: '5.x',
});
