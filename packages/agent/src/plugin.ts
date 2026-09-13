import { BACKGROUND_CONTEXT } from '@earendil-works/pi-agent-core';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { agentAdminRoutes, isAgentAdminEnabled } from './admin/admin.routes';
import { agentRoutes } from './agent.routes';
import type { AgentModuleConfig } from './config';
import { createAgentModuleContext } from './factory';

export interface AgentPluginOptions {
  config: AgentModuleConfig | ((fastify: FastifyInstance) => AgentModuleConfig);
  /** 路由前缀；须在插件内 register，勿用 Fastify register 的 prefix（fp 插件不生效） */
  routePrefix?: string;
}

async function agentPluginImpl(fastify: FastifyInstance, options: AgentPluginOptions): Promise<void> {
  const config =
    typeof options.config === 'function' ? options.config(fastify) : options.config;
  const ctx = createAgentModuleContext(config);

  fastify.decorate('agentService', ctx.service);
  fastify.decorate('frontendToolBridge', ctx.frontendToolBridge);
  fastify.decorate('agentRuntimeHost', ctx.runtimeHost);
  fastify.decorate('agentRepository', ctx.repository);
  fastify.decorate('agentObservability', ctx.observability);

  fastify.addHook('onReady', async () => {
    await ctx.frontendToolBridge.reconcileOrphaned();
    await ctx.observability.reconcileOnStartup({
      beforeIdleClose: (sessionId) =>
        ctx.runtimeHost.closeSession(sessionId, BACKGROUND_CONTEXT).catch(() => undefined),
    });
  });

  fastify.addHook('onClose', async () => {
    await ctx.service.closeAll();
  });

  await fastify.register(agentRoutes, { prefix: options.routePrefix ?? '/api/agent' });

  if (isAgentAdminEnabled()) {
    await fastify.register(agentAdminRoutes, { prefix: '/api/admin/agent' });
  }
}

export const agentPlugin = fp(agentPluginImpl, {
  name: '@zeroDraw/agent',
  dependencies: ['@zeroDraw/auth', '@zeroDraw/project', '@zeroDraw/infra'],
  fastify: '5.x',
});
