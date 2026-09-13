import type { AgentLane, Context } from '@earendil-works/pi-agent-core';
import type { ImageContent } from '@earendil-works/pi-ai';
import type { AgentResumeParams, AgentResumeResponse } from '@zeroDraw/api-contract';
import { AgentRuntimeError } from './errors';

export async function releaseLaneIfBusy(lane: AgentLane, context: Context): Promise<void> {
  const info = await lane.inspectExecution(context);
  if (!info.current) return;

  await lane.abort(context);
  await Promise.race([
    lane.waitForIdle(context),
    new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
  ]).catch(() => undefined);
}

export interface LanePromptResult {
  suspended: boolean;
  operationId?: string;
}

/** 执行 lane.prompt，含 LaneBusy 重试 */
export async function runLanePrompt(
  lane: AgentLane,
  message: string,
  images: ImageContent[] | undefined,
  context: Context,
): Promise<LanePromptResult> {
  await releaseLaneIfBusy(lane, context);

  const attempt = await lane.prompt(message, images, context);
  if (attempt.ok) {
    if (attempt.value.status === 'suspended') {
      return { suspended: true, operationId: attempt.value.operationId };
    }
    return { suspended: false };
  }

  const errText = String(attempt.error);
  if (!errText.includes('LaneBusy')) {
    throw new Error(errText);
  }

  await releaseLaneIfBusy(lane, context);
  const retry = await lane.prompt(message, images, context);
  if (!retry.ok) {
    throw new Error(String(retry.error));
  }
  if (retry.value.status === 'suspended') {
    return { suspended: true, operationId: retry.value.operationId };
  }
  return { suspended: false };
}

export async function runLaneResume(
  lane: AgentLane,
  input: AgentResumeParams,
  context: Context,
): Promise<AgentResumeResponse> {
  if (input.decision === 'reject') {
    const result = await lane.abort(context);
    if (!result.ok) {
      if (result.error._tag === 'NoActiveOperation') {
        throw new AgentRuntimeError('当前没有可拒绝的挂起操作');
      }
      throw new AgentRuntimeError(String(result.error));
    }
    return { status: 'aborted', operationId: result.value.operationId };
  }

  const result = await lane.resume(context);
  if (!result.ok) {
    if (result.error._tag === 'NothingToResume') {
      throw new AgentRuntimeError('当前没有可恢复的挂起操作');
    }
    throw new AgentRuntimeError(String(result.error));
  }

  const value = result.value;
  if ('status' in value && value.status === 'suspended') {
    return { status: 'suspended', operationId: value.operationId };
  }

  const outcome = value as {
    operationId: string;
    status: 'completed' | 'declined' | 'aborted' | 'failed';
  };
  if (outcome.status === 'aborted') return { status: 'aborted', operationId: outcome.operationId };
  if (outcome.status === 'failed') return { status: 'failed', operationId: outcome.operationId };
  return { status: 'completed', operationId: outcome.operationId };
}
