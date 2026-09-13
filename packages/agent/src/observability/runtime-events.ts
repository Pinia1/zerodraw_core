import type { AgentObservabilityContext } from './types';

/** Runtime host 仅需的观测写入接口（harness / worker 事件）。 */
export interface AgentRuntimeObservability {
  onHarnessOpened(ctx: AgentObservabilityContext): Promise<void>;
  onHarnessIdleClosed(ctx: AgentObservabilityContext): Promise<void>;
  onWorkerAssigned(ctx: AgentObservabilityContext & { workerSlot: number }): Promise<void>;
  onWorkerCrashed(input: {
    workerSlot: number;
    sessionIds: string[];
    errorMessage?: string;
  }): Promise<void>;
}
