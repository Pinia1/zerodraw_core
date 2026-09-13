import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
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

  fastify.addHook('onReady', async () => {
    await ctx.frontendToolBridge.reconcileOrphaned();
  });

  fastify.addHook('onClose', async () => {
    await ctx.service.closeAll();
  });

  await fastify.register(agentRoutes, { prefix: options.routePrefix ?? '/api/agent' });
}

export const agentPlugin = fp(agentPluginImpl, {
  name: '@zeroDraw/agent',
  dependencies: ['@zeroDraw/auth', '@zeroDraw/project', '@zeroDraw/generate', '@zeroDraw/infra'],
  fastify: '5.x',
});
