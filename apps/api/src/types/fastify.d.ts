import 'fastify';
import type {
  AgentObservabilityService,
  AgentRepository,
  AgentRuntimeHost,
  AgentService,
  FrontendToolBridge,
} from '@zeroDraw/agent';
import type { AuthService } from '../modules/Auth/auth.services';
import type { GithubService } from '../modules/Passport/github.service';
import type { ProjectService } from '../modules/Project/project.services';
import type { LocalStorageService } from '../modules/Local/local.storage';
import type { R2Service } from '../modules/R2/r2.services';
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
    localStorage: LocalStorageService;
    r2Service?: R2Service;
    volcService?: VolcService;
    uploadServices: UploadServices;
    githubService?: GithubService;
    agentService: AgentService;
    frontendToolBridge: FrontendToolBridge;
    agentRuntimeHost: AgentRuntimeHost;
    agentRepository: AgentRepository;
    agentObservability: AgentObservabilityService;
  }
}
