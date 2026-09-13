import 'fastify';
import type { AgentRepository, AgentService, FrontendToolBridge } from '@zeroDraw/agent';
import type { AgentRuntimeHost } from '@zeroDraw/agent';
import type { AuthService } from '../modules/Auth/auth.services';
import type { AssetsService } from '../modules/Assets/assets.services';
import type { GenerateQueue } from '../modules/AIGenerate/generate.queue';
import type { GenerateService } from '../modules/AIGenerate/generate.services';
import type { GithubService } from '../modules/Passport/github.service';
import type { ProjectService } from '../modules/Project/project.services';
import type { R2Service } from '../modules/R2/r2.services';
import type { LibService } from '../modules/Lib/lib.services';
import type { BananaService } from '../modules/NanoBanana/banana.services';
import type { SeedreamService } from '../modules/Seedream/seedream.services';
import type { VolcService } from '../modules/Volc/volc.services';
import type { UploadServices } from '../plugins/infra.plugin';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      userId: number;
      [key: string]: unknown;
    };
  }

  interface FastifyReply {
    success<T>(data: T): FastifyReply;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authService: AuthService;
    projectService: ProjectService;
    generateService: GenerateService;
    generateQueue: GenerateQueue;
    assetsService: AssetsService;
    libService: LibService;
    r2Service: R2Service;
    volcService: VolcService;
    uploadServices: UploadServices;
    githubService: GithubService;
    bananaService: BananaService;
    seedreamService: SeedreamService;
    agentService: AgentService;
    frontendToolBridge: FrontendToolBridge;
    agentRuntimeHost: AgentRuntimeHost;
    agentRepository: AgentRepository;
  }
}
