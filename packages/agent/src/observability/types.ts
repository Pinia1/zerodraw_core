import type {
  AgentPromptRunStatus,
  AgentRuntimeHostKind,
  AgentSessionEventType,
} from '@zeroDraw/api-contract';
import type { Usage } from '@earendil-works/pi-ai';

export interface AgentRuntimeSnapshot {
  sessionId: string;
  userId: number;
  projectId: string | null;
  loaded: boolean;
  executing: boolean;
  runtimeHost: AgentRuntimeHostKind;
  workerSlot: number | null;
  heartbeatAt: number;
}

export interface AgentObservabilityContext {
  sessionId: string;
  userId: number;
  projectId?: string | null;
}

export interface RecordEventInput extends AgentObservabilityContext {
  eventType: AgentSessionEventType;
  payload?: Record<string, unknown>;
}

export interface StartPromptRunInput extends AgentObservabilityContext {
  runtimeHost: AgentRuntimeHostKind;
  workerSlot?: number | null;
  /** prompt=用户发消息，resume=放行挂起操作 */
  kind?: 'prompt' | 'resume';
}

export interface FinishPromptRunInput {
  runId: string;
  status: AgentPromptRunStatus;
  usage?: Usage | null;
  errorMessage?: string | null;
  workerSlot?: number | null;
}

export interface AgentRedisLike {
  set(key: string, value: string, mode: 'EX', ttlSeconds: number): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
}
