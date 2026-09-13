import { BACKGROUND_CONTEXT, type Context } from '@earendil-works/pi-agent-core';
import type { AgentPromptRunStatus, AgentResumeParams, AgentResumeResponse } from '@zeroDraw/api-contract';
import {
  mapHarnessEventToSseFrame,
  withAgentSseStream,
  type AgentSessionMeta,
} from '@zeroDraw/agent-worker/runtime';
import { getAgentErrors, getAgentLogger } from '../../../config';
import { toObservabilityContext, type AgentRuntimeObservability } from '../../../observability';
import type { AgentDeps } from '../../../tools';
import type { FrontendToolBridge } from '../../../tools/frontend/bridge';
import { HostToolExecutor } from '../tool-executor';
import type { AgentRuntimeHost, AgentStreamPromptOptions } from '../types';
import { AgentWorkerPool } from './worker-pool';

export class WorkerRuntimeHost implements AgentRuntimeHost {
  readonly mode = 'worker' as const;
  private readonly pool: AgentWorkerPool;
  private readonly observability: AgentRuntimeObservability;

  constructor(
    deps: AgentDeps,
    frontendToolBridge: FrontendToolBridge,
    poolSize: number,
    observability: AgentRuntimeObservability,
  ) {
    const toolExecutor = new HostToolExecutor(frontendToolBridge, deps);
    this.observability = observability;
    this.pool = new AgentWorkerPool({
      size: poolSize,
      toolExecutor,
      onHarnessLifecycle: (message) => {
        const ctx = toObservabilityContext(message.meta);
        if (message.event === 'harness_opened') {
          void observability.onHarnessOpened(ctx);
        } else {
          void observability.onHarnessIdleClosed(ctx);
        }
      },
      onSlotCrash: (slotId, sessionIds) => {
        void observability.onWorkerCrashed({ workerSlot: slotId, sessionIds });
      },
    });
  }

  async streamPrompt(options: AgentStreamPromptOptions): Promise<void> {
    const {
      sessionId,
      meta,
      message,
      images,
      raw,
      corsOrigin,
      markSuspended,
      markActive,
      onFinished,
    } = options;

    const slot = await this.pool.acquireForSession(sessionId);
    await this.observability.onWorkerAssigned({ ...toObservabilityContext(meta), workerSlot: slot.id });

    let finishStatus: AgentPromptRunStatus = 'completed';
    let errorMessage: string | undefined;
    let finished = false;

    await withAgentSseStream(raw, corsOrigin, async ({ send }) => {
      getAgentLogger().info('[Agent LLM] prompt', {
        sessionId,
        message,
        imageCount: images?.length ?? 0,
        host: this.mode,
        workerSlot: slot.id,
        poolSize: this.pool.size,
      });

      let requestId = '';

      await new Promise<void>((resolve, reject) => {
        try {
          requestId = slot.sendPrompt(meta, message, images, {
            onEvent: (eventMessage) => {
              const frame = mapHarnessEventToSseFrame(
                eventMessage.event,
                eventMessage.payload,
                sessionId,
                { onFault: () => this.evict(sessionId) },
              );
              if (!frame) return;
              if (frame.type === 'suspended') void markSuspended(sessionId);
              if (frame.type === 'done' && frame.status !== 'failed') void markActive(sessionId);
              send(frame);
            },
            onFinished: (finishedMessage) => {
              finished = true;
              if (!finishedMessage.ok) {
                finishStatus = 'failed';
                errorMessage = finishedMessage.error ?? 'Worker prompt failed';
                send({ type: 'error', message: errorMessage });
              } else if (finishedMessage.suspended) {
                finishStatus = 'suspended';
                void markSuspended(sessionId);
                send({ type: 'suspended', operationId: finishedMessage.operationId });
              }
              resolve();
            },
          });
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      })
        .catch((error) => {
          finished = true;
          finishStatus = 'failed';
          errorMessage = error instanceof Error ? error.message : String(error);
          send({ type: 'error', message: errorMessage });
        })
        .finally(() => {
          if (requestId) slot.clearPromptHandler(requestId);
        });
    });

    if (!finished) {
      finishStatus = 'aborted';
    }

    await onFinished?.({ status: finishStatus, errorMessage });
  }

  async resumeSession(
    sessionId: string,
    meta: AgentSessionMeta,
    input: AgentResumeParams,
    _context: Context,
  ): Promise<AgentResumeResponse> {
    const slot = await this.pool.acquireForSession(sessionId);
    await this.observability.onWorkerAssigned({ ...toObservabilityContext(meta), workerSlot: slot.id });
    const result = await slot.resume(meta, input);
    if (!result.ok || !result.result) {
      throw getAgentErrors().business(result.error ?? 'Worker resume failed');
    }
    return result.result;
  }

  async closeSession(sessionId: string, _context: Context): Promise<void> {
    const slot = this.pool.getSlotForSession(sessionId);
    if (!slot) return;

    try {
      await slot.closeSession(sessionId);
    } finally {
      this.pool.releaseSession(sessionId);
    }
  }

  async closeAll(_context: Context): Promise<void> {
    this.pool.shutdownAll();
  }

  evict(sessionId: string): void {
    void this.closeSession(sessionId, BACKGROUND_CONTEXT).catch(() => undefined);
  }
}
