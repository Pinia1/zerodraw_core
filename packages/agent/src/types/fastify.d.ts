import 'fastify';
import type { AgentObservabilityService } from '../observability';
import type { AgentRepository } from '../session/repository';
import type { AgentService } from '../session/service';
import type { AgentRuntimeHost } from '../runtime/host/types';
import type { FrontendToolBridge } from '../tools/frontend/bridge';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      userId: number;
    };
  }

  interface FastifyReply {
    success<T>(data: T): FastifyReply;
  }

  interface FastifyInstance {
    agentService: AgentService;
    frontendToolBridge: FrontendToolBridge;
    agentRuntimeHost: AgentRuntimeHost;
    agentRepository: AgentRepository;
    agentObservability: AgentObservabilityService;
  }
}
