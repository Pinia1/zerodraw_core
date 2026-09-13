import type { AgentObservabilityService } from './service';
import type { AgentObservabilityContext, FinishPromptRunInput, StartPromptRunInput } from './types';

type PromptRunStart = Pick<StartPromptRunInput, 'runtimeHost' | 'workerSlot' | 'kind'>;

export interface PromptRunScope {
  runId: string;
  finish(input: Omit<FinishPromptRunInput, 'runId'>): Promise<void>;
}

/** 开启 prompt run，由调用方在适当时机 finish（如 SSE onFinished）。 */
export async function startPromptRunScope(
  obs: AgentObservabilityService,
  ctx: AgentObservabilityContext,
  start: PromptRunStart,
): Promise<PromptRunScope> {
  const runId = await obs.startPromptRun({ ...ctx, ...start });
  return {
    runId,
    finish: (input) => obs.finishPromptRun(ctx, { runId, ...input }),
  };
}

/** 同步完成型 prompt run：自动 start → fn → finish，异常时标记 failed。 */
export async function withPromptRun<T>(
  obs: AgentObservabilityService,
  ctx: AgentObservabilityContext,
  start: PromptRunStart,
  fn: () => Promise<T>,
  toFinish: (result: T) => Omit<FinishPromptRunInput, 'runId'>,
): Promise<T> {
  const scope = await startPromptRunScope(obs, ctx, start);
  try {
    const result = await fn();
    await scope.finish(toFinish(result));
    return result;
  } catch (error) {
    await scope.finish({
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
