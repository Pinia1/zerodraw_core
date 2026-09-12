import {
  AgentHarness,
  StorageBackedSession,
  type AgentHarnessTool,
  type AgentLane,
  type Context,
  type Session,
} from '@earendil-works/pi-agent-core';
import {
  createModels,
  createProvider,
  envApiKeyAuth,
  type Model,
  type MutableModels,
} from '@earendil-works/pi-ai';
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import {
  AGENT_MAIN_LANE,
  createAgentToolContext,
  type AgentSessionMeta,
  type AgentToolContext,
} from '../session/types';
import { MySqlStorage } from '../storage/mysql.storage';
import { agentDeps, createAgentTools, type AgentDeps } from '../tools';
import { frontendToolBridge } from '../tools/frontend';
import { releaseLaneIfBusy } from './lane-idle';
import { buildAgentSystemPrompt, buildToolsFingerprint } from './systemPrompt';

const AGENT_PROVIDER_ID = 'agent-relay';

function buildAgentModel(): Model<'openai-completions'> {
  return {
    id: env.AGENT_MODEL,
    name: env.AGENT_MODEL,
    provider: AGENT_PROVIDER_ID,
    baseUrl: env.AGENT_BASE_URL,
    api: 'openai-completions',
    reasoning: false,
    input: ['text', 'image'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 8192,
  };
}

interface CachedRuntime {
  session: Session<AgentSessionMeta>;
  harness: AgentHarness<AgentToolContext>;
  lane: AgentLane;
  toolsFingerprint: string;
}

export class AgentRegister {
  private readonly models: MutableModels;
  private readonly model: Model<'openai-completions'>;
  private readonly tools: AgentHarnessTool<AgentToolContext, any, any>[];
  private readonly toolsFingerprint: string;
  private readonly systemPrompt: string;
  private readonly cache = new Map<string, CachedRuntime>();

  constructor(private readonly deps: AgentDeps = agentDeps) {
    this.model = buildAgentModel();
    this.models = createModels();
    this.models.setProvider(
      createProvider({
        id: AGENT_PROVIDER_ID,
        name: 'Agent Relay',
        baseUrl: env.AGENT_BASE_URL,
        auth: { apiKey: envApiKeyAuth('Agent relay API key', ['AGENT_API_KEY']) },
        models: [this.model],
        api: openAICompletionsApi(),
      })
    );
    this.tools = createAgentTools();
    this.toolsFingerprint = buildToolsFingerprint(this.tools);
    this.systemPrompt = buildAgentSystemPrompt(this.tools);
    logger.info('[Agent] tools registered', {
      tools: this.tools.map((tool) => tool.name),
    });
  }

  /** 取（或惰性打开）一个会话的运行时，跨请求复用同一 harness/lane。 */
  async get(meta: AgentSessionMeta, context: Context): Promise<CachedRuntime> {
    const hit = this.cache.get(meta.id);
    if (hit) {
      if (hit.toolsFingerprint !== this.toolsFingerprint) {
        logger.info('[Agent] tools changed, recreating harness', { sessionId: meta.id });
        await this.close(meta.id, context);
      } else {
        await releaseLaneIfBusy(hit.lane, context).catch(() => undefined);
        return hit;
      }
    }

    const session = new StorageBackedSession<AgentSessionMeta>(meta, new MySqlStorage(meta.id));
    const { harness } = await AgentHarness.create<AgentToolContext>(
      {
        session,
        models: this.models,
        model: this.model,
        tools: this.tools,
        toolContext: createAgentToolContext(meta.userId, meta.id, this.deps, frontendToolBridge),
        systemPrompt: this.systemPrompt,
      },
      context
    );

    const lane = await harness.lane(AGENT_MAIN_LANE, context);
    await releaseLaneIfBusy(lane, context).catch(() => undefined);
    const entry: CachedRuntime = {
      session,
      harness,
      lane,
      toolsFingerprint: this.toolsFingerprint,
    };
    this.cache.set(meta.id, entry);
    return entry;
  }

  has(sessionId: string): boolean {
    return this.cache.has(sessionId);
  }

  /** fault 后 harness 已 seal，丢弃缓存以便下次请求重建。 */
  evict(sessionId: string): void {
    this.cache.delete(sessionId);
  }

  async close(sessionId: string, context: Context): Promise<void> {
    const entry = this.cache.get(sessionId);
    if (!entry) return;
    this.cache.delete(sessionId);
    await entry.harness.close(context);
    await entry.session.close(context);
  }

  async closeAll(context: Context): Promise<void> {
    const entries = [...this.cache.values()];
    this.cache.clear();
    await Promise.all(
      entries.map(async (entry) => {
        try {
          await entry.harness.close(context);
        } catch {
          // 尽力而为
        }
        try {
          await entry.session.close(context);
        } catch {
          // 尽力而为
        }
      })
    );
  }
}

export const agentRegister = new AgentRegister();
