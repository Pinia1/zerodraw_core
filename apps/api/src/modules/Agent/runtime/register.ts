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
import { getGrsaiChatBaseUrl } from '../../../config/grsai';
import { MySqlStorage } from '../storage/mysql.storage';
import {
  AGENT_MAIN_LANE,
  createAgentToolContext,
  type AgentSessionMeta,
  type AgentToolContext,
} from '../session/types';
import { agentDeps, createAgentTools, type AgentDeps } from '../tools';
import { releaseLaneIfBusy } from './lane-idle';

function buildAgentModel(): Model<'openai-completions'> {
  const baseUrl = getGrsaiChatBaseUrl();
  return {
    id: env.AGENT_MODEL,
    name: env.AGENT_MODEL,
    provider: 'grsai',
    baseUrl,
    api: 'openai-completions',
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 8192,
  };
}

const SYSTEM_PROMPT = [
  '你是 zeroDraw 的创作助手，帮助用户创作插画、设计图等内容。',
  '你可以调用工具来查询用户的创作项目、读取项目详情、提交图像生成任务。',
  '需要项目信息时优先调用工具，不要编造项目内容。',
  '生成图像是异步任务：调用 generate_image 后告知用户 taskId，并提示可轮询进度。',
  '用简洁的中文回答。',
].join('\n');

interface CachedRuntime {
  session: Session<AgentSessionMeta>;
  harness: AgentHarness<AgentToolContext>;
  lane: AgentLane;
}

export class AgentRegister {
  private readonly models: MutableModels;
  private readonly model: Model<'openai-completions'>;
  private readonly tools: AgentHarnessTool<AgentToolContext, any, any>[];
  private readonly cache = new Map<string, CachedRuntime>();

  constructor(private readonly deps: AgentDeps = agentDeps) {
    this.model = buildAgentModel();
    this.models = createModels();
    this.models.setProvider(
      createProvider({
        id: 'grsai',
        name: 'Grsai',
        baseUrl: getGrsaiChatBaseUrl(),
        auth: { apiKey: envApiKeyAuth('Grsai API key', ['NANOBANANA_API_KEY']) },
        models: [this.model],
        api: openAICompletionsApi(),
      }),
    );
    this.tools = createAgentTools();
  }

  /** 取（或惰性打开）一个会话的运行时，跨请求复用同一 harness/lane。 */
  async get(meta: AgentSessionMeta, context: Context): Promise<CachedRuntime> {
    const hit = this.cache.get(meta.id);
    if (hit) {
      await releaseLaneIfBusy(hit.lane, context).catch(() => undefined);
      return hit;
    }

    const session = new StorageBackedSession<AgentSessionMeta>(meta, new MySqlStorage(meta.id));
    const { harness } = await AgentHarness.create<AgentToolContext>(
      {
        session,
        models: this.models,
        model: this.model,
        tools: this.tools,
        toolContext: createAgentToolContext(meta.userId, this.deps),
        systemPrompt: SYSTEM_PROMPT,
      },
      context,
    );

    const lane = await harness.lane(AGENT_MAIN_LANE, context);
    await releaseLaneIfBusy(lane, context).catch(() => undefined);
    const entry: CachedRuntime = { session, harness, lane };
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
      }),
    );
  }
}

export const agentRegister = new AgentRegister();
