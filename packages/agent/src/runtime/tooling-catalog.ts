import {
  createModels,
  createProvider,
  envApiKeyAuth,
  type Model,
  type MutableModels,
} from '@earendil-works/pi-ai';
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy';
import type { AgentToolingCatalog } from '@zeroDraw/agent-worker/runtime';
import { getAgentEnv, getAgentLogger } from '../config';
import { summarizeToolRegistry } from '../framework';
import { createAgentTools, type AgentHarnessToolWithMeta } from '../tools';
import { buildAgentSystemPrompt, buildToolsFingerprint } from './systemPrompt';

const AGENT_PROVIDER_ID = 'agent-relay';

export function buildAgentModel(): Model<'openai-completions'> {
  return {
    id: getAgentEnv().AGENT_MODEL,
    name: getAgentEnv().AGENT_MODEL,
    provider: AGENT_PROVIDER_ID,
    baseUrl: getAgentEnv().AGENT_BASE_URL,
    api: 'openai-completions',
    reasoning: false,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 8192,
  };
}

class AgentToolingCatalogImpl implements AgentToolingCatalog {
  private models: MutableModels | null = null;
  private tools: AgentHarnessToolWithMeta[] | null = null;
  private systemPrompt: string | null = null;
  private toolsFingerprint: string | null = null;

  getTooling() {
    if (!this.tools) {
      this.tools = createAgentTools();
      this.toolsFingerprint = buildToolsFingerprint(this.tools);
      this.systemPrompt = buildAgentSystemPrompt(this.tools);
      getAgentLogger().info('[Agent] tools registered', {
        tools: summarizeToolRegistry(this.tools),
      });
    }
    return {
      tools: this.tools,
      toolsFingerprint: this.toolsFingerprint!,
      systemPrompt: this.systemPrompt!,
    };
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
        api: openAICompletionsApi(),
      }),
    );
    return this.models;
  }

  getModel(): Model<'openai-completions'> {
    return buildAgentModel();
  }
}

export function createAgentToolingCatalog(): AgentToolingCatalog {
  return new AgentToolingCatalogImpl();
}
