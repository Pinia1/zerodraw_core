import {
  createModels,
  createProvider,
  envApiKeyAuth,
  type Model,
  type MutableModels,
} from '@earendil-works/pi-ai';
import { anthropicMessagesApi } from '@earendil-works/pi-ai/api/anthropic-messages.lazy';
import type { AgentToolingCatalog, AgentToolingOptions } from '@zeroDraw/agent-worker/runtime';
import { getAgentEnv, getAgentLogger } from '../config';
import { summarizeToolRegistry } from '../framework';
import { createAgentTools, type AgentHarnessToolWithMeta } from '../tools';
import { buildAgentSystemPrompt, buildToolsFingerprint } from './systemPrompt';

const AGENT_PROVIDER_ID = 'agent-relay';

export function buildAgentModel(): Model<'anthropic-messages'> {
  return {
    id: getAgentEnv().AGENT_MODEL,
    name: getAgentEnv().AGENT_MODEL,
    provider: AGENT_PROVIDER_ID,
    baseUrl: getAgentEnv().AGENT_BASE_URL,
    api: 'anthropic-messages',
    reasoning: false,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 8192,
  };
}

interface ToolingSnapshot {
  tools: AgentHarnessToolWithMeta[];
  toolsFingerprint: string;
  systemPrompt: string;
}

function buildSnapshot(clientTools?: AgentToolingOptions['clientTools']): ToolingSnapshot {
  const tools = createAgentTools({ clientTools });
  return {
    tools,
    toolsFingerprint: buildToolsFingerprint(tools),
    systemPrompt: buildAgentSystemPrompt(tools),
  };
}

function snapshotCacheKey(clientTools?: AgentToolingOptions['clientTools']): string {
  if (clientTools === undefined) return '__default__';
  return JSON.stringify(clientTools);
}

class AgentToolingCatalogImpl implements AgentToolingCatalog {
  private models: MutableModels | null = null;
  private readonly snapshotCache = new Map<string, ToolingSnapshot>();
  private loggedKeys = new Set<string>();

  getTooling(options?: AgentToolingOptions) {
    const key = snapshotCacheKey(options?.clientTools);
    let snapshot = this.snapshotCache.get(key);
    if (!snapshot) {
      snapshot = buildSnapshot(options?.clientTools);
      this.snapshotCache.set(key, snapshot);
    }

    if (!this.loggedKeys.has(key)) {
      this.loggedKeys.add(key);
      getAgentLogger().info('[Agent] tools registered', {
        clientTools:
          options?.clientTools === undefined
            ? 'default'
            : options.clientTools === null
              ? 0
              : options.clientTools.length,
        tools: summarizeToolRegistry(snapshot.tools),
      });
    }

    return snapshot;
  }

  getModels(): MutableModels {
    if (this.models) return this.models;
    const model = buildAgentModel();
    this.models = createModels();
    this.models.setProvider(
      createProvider({
        id: AGENT_PROVIDER_ID,
        name: 'Agent Relay',
        baseUrl: getAgentEnv().AGENT_BASE_URL,
        auth: { apiKey: envApiKeyAuth('Agent relay API key', ['AGENT_API_KEY']) },
        models: [model],
        api: anthropicMessagesApi(),
      }),
    );
    return this.models;
  }

  getModel(): Model<'anthropic-messages'> {
    return buildAgentModel();
  }
}

export function createAgentToolingCatalog(): AgentToolingCatalog {
  return new AgentToolingCatalogImpl();
}
