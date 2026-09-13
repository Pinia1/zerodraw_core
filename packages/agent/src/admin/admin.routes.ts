import { ZodTypeProvider } from '@fastify/type-provider-zod';
import {
  agentAdminCloseSessionBodySchema,
  agentAdminSessionsQuerySchema,
  agentAdminUsageQuerySchema,
  agentSessionParamsSchema,
  type AgentAdminCloseSessionBody,
  type AgentAdminSessionsQuery,
  type AgentAdminUsageQuery,
  type AgentSessionParams,
} from '@zeroDraw/api-contract';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getAgentEnv, getAgentErrors, getAgentModuleConfig } from '../config';
import type { AgentObservabilityService } from '../observability';
import type { AgentService } from '../session/service';

function authenticateAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  done: (err?: Error) => void,
): void {
  const token = getAgentEnv().AGENT_ADMIN_TOKEN;
  if (!token) {
    reply.code(503).send({ code: 5000, message: 'Admin observability is disabled', data: null });
    return;
  }
  const header = request.headers['x-admin-token'];
  if (header !== token) {
    done(getAgentErrors().forbidden('Invalid admin token'));
    return;
  }
  done();
}

export async function agentAdminRoutes(fastify: FastifyInstance) {
  const observability = fastify.agentObservability as AgentObservabilityService;
  const agentService = fastify.agentService as AgentService;
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.addHook('onRequest', authenticateAdmin);

  app.get('/overview', async (_request, reply) => {
    const data = await observability.getOverview();
    return reply.success(data);
  });

  app.get('/runtime', async (_request, reply) => {
    const data = await observability.listRuntimeSnapshots();
    return reply.success(data);
  });

  app.get('/sessions', { schema: { querystring: agentAdminSessionsQuerySchema } }, async (request, reply) => {
    const query = request.query as AgentAdminSessionsQuery;
    const data = await observability.listSessions(query);
    return reply.success(data);
  });

  app.get(
    '/sessions/:id/timeline',
    { schema: { params: agentSessionParamsSchema } },
    async (request, reply) => {
      const { id } = request.params as AgentSessionParams;
      const data = await observability.getTimeline(id);
      if (!data) throw getAgentErrors().notFound();
      return reply.success(data);
    },
  );

  app.get('/usage', { schema: { querystring: agentAdminUsageQuerySchema } }, async (request, reply) => {
    const query = request.query as AgentAdminUsageQuery;
    const data = await observability.aggregateUsage(query);
    return reply.success(data);
  });

  app.post(
    '/sessions/:id/close',
    {
      schema: {
        params: agentSessionParamsSchema,
        body: agentAdminCloseSessionBodySchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as AgentSessionParams;
      const { closeReason } = request.body as AgentAdminCloseSessionBody;
      const closedId = await agentService.closeSessionAdmin(id, closeReason);
      return reply.success({ id: closedId, closeReason });
    },
  );
}

export function isAgentAdminEnabled(): boolean {
  return Boolean(getAgentModuleConfig().env.AGENT_ADMIN_TOKEN);
}
