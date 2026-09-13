import type { AgentRuntimeHostKind } from '@zeroDraw/api-contract';
import type { AgentRedisLike, AgentRuntimeSnapshot } from './types';

const RUNTIME_KEY_PREFIX = 'agent:runtime:';
const RUNTIME_INDEX_KEY = 'agent:runtime:index';
const RUNTIME_TTL_SECONDS = 90;

function runtimeKey(sessionId: string): string {
  return `${RUNTIME_KEY_PREFIX}${sessionId}`;
}

export class AgentRuntimeStore {
  private readonly memory = new Map<string, AgentRuntimeSnapshot>();

  constructor(
    private readonly runtimeHost: AgentRuntimeHostKind,
    private readonly redis?: AgentRedisLike,
  ) {}

  async touch(
    input: Omit<AgentRuntimeSnapshot, 'heartbeatAt'> & { heartbeatAt?: number },
  ): Promise<void> {
    const snapshot: AgentRuntimeSnapshot = {
      ...input,
      heartbeatAt: input.heartbeatAt ?? Date.now(),
    };

    if (this.redis) {
      const key = runtimeKey(snapshot.sessionId);
      await this.redis.set(key, JSON.stringify(snapshot), 'EX', RUNTIME_TTL_SECONDS);
      await this.redis.sadd(RUNTIME_INDEX_KEY, snapshot.sessionId);
      return;
    }

    this.memory.set(snapshot.sessionId, snapshot);
  }

  async setExecuting(sessionId: string, executing: boolean): Promise<void> {
    const current = await this.get(sessionId);
    if (!current) return;
    await this.touch({ ...current, executing });
  }

  async setLoaded(sessionId: string, loaded: boolean): Promise<void> {
    const current = await this.get(sessionId);
    if (!current) return;
    await this.touch({ ...current, loaded });
  }

  async remove(sessionId: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(runtimeKey(sessionId));
      await this.redis.srem(RUNTIME_INDEX_KEY, sessionId);
      return;
    }
    this.memory.delete(sessionId);
  }

  async get(sessionId: string): Promise<AgentRuntimeSnapshot | null> {
    if (this.redis) {
      const raw = await this.redis.get(runtimeKey(sessionId));
      if (!raw) return null;
      try {
        return JSON.parse(raw) as AgentRuntimeSnapshot;
      } catch {
        return null;
      }
    }
    return this.memory.get(sessionId) ?? null;
  }

  async listAll(): Promise<AgentRuntimeSnapshot[]> {
    if (this.redis) {
      const ids = await this.redis.smembers(RUNTIME_INDEX_KEY);
      const snapshots: AgentRuntimeSnapshot[] = [];
      for (const sessionId of ids) {
        const snapshot = await this.get(sessionId);
        if (snapshot) {
          snapshots.push(snapshot);
        } else {
          await this.redis.srem(RUNTIME_INDEX_KEY, sessionId);
        }
      }
      return snapshots;
    }
    return [...this.memory.values()];
  }

  get configuredRuntimeHost(): AgentRuntimeHostKind {
    return this.runtimeHost;
  }
}
