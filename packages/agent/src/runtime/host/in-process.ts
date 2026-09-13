import { BACKGROUND_CONTEXT, withAbortSignal, type Context } from '@earendil-works/pi-agent-core';
import type { AgentPromptRunStatus, AgentResumeParams, AgentResumeResponse } from '@zeroDraw/api-contract';
import {
  AgentRuntimeError,
  releaseLaneIfBusy,
  runLanePrompt,
  runLaneResume,
  subscribeHarnessEventsToSse,
  withAgentSseStream,
  type AgentToolingCatalog,
} from '@zeroDraw/agent-worker/runtime';
import { getAgentErrors, getAgentLogger } from '../../config';
import { toObservabilityContext, type AgentRuntimeObservability } from '../../observability';
import type { AgentDeps } from '../../tools';
import type { FrontendToolBridge } from '../../tools/frontend/bridge';
import { createAgentToolContext, type AgentSessionMeta } from '../../session/types';
import { createApiHarnessSessionStore } from '../harness-store';
import type { AgentRuntimeHost, AgentStreamPromptOptions } from './types';

export class InProcessRuntimeHost implements AgentRuntimeHost {
  readonly mode = 'inprocess' as const;

  private readonly sessions;
  private readonly observability: AgentRuntimeObservability;

  constructor(
    private readonly deps: AgentDeps,
    frontendToolBridge: FrontendToolBridge,
    toolingCatalog: AgentToolingCatalog,
    harnessIdleCloseMs: number,
    observability: AgentRuntimeObservability,
  ) {
    this.observability = observability;
    this.sessions = createApiHarnessSessionStore(
      toolingCatalog,
      {
        createToolContext: (meta) =>
          createAgentToolContext({
            userId: meta.userId,
            sessionId: meta.id,
            deps: this.deps,
            frontendTools: frontendToolBridge,
          }),
      },
      {
        idleCloseMs: harnessIdleCloseMs,
        onHarnessOpened: (_sessionId, meta) => {
          void observability.onHarnessOpened(toObservabilityContext(meta as AgentSessionMeta));
        },
        onHarnessIdleClosed: (_sessionId, meta) => {
          void observability.onHarnessIdleClosed(toObservabilityContext(meta as AgentSessionMeta));
        },
      },
    );
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

    let finishStatus: AgentPromptRunStatus = 'completed';
    let errorMessage: string | undefined;

    await withAgentSseStream(raw, corsOrigin, async ({ send, abortSignal }) => {
      const { harness, lane } = await this.sessions.get(meta, BACKGROUND_CONTEXT);
      const context = withAbortSignal(abortSignal, BACKGROUND_CONTEXT);

      const unsubscribe = subscribeHarnessEventsToSse(
        harness,
        sessionId,
        send,
        markSuspended,
        markActive,
        () => this.sessions.evict(sessionId),
      );

      raw.on('close', () => {
        for (const stop of unsubscribe) stop();
        void releaseLaneIfBusy(lane, context).catch(() => undefined);
      });

      getAgentLogger().info('[Agent LLM] prompt', {
        sessionId,
        message,
        imageCount: images?.length ?? 0,
        host: this.mode,
      });

      let scheduleIdleClose = true;

      try {
        const result = await runLanePrompt(lane, message, images, context);
        if (result.suspended) {
          scheduleIdleClose = false;
          finishStatus = 'suspended';
          await markSuspended(sessionId);
          send({ type: 'suspended', operationId: result.operationId });
        }
      } catch (error) {
        if (abortSignal.aborted) {
          finishStatus = 'aborted';
        } else {
          finishStatus = 'failed';
          errorMessage = error instanceof Error ? error.message : String(error);
        }
        if (error instanceof Error && error.name === 'HarnessFault') {
          scheduleIdleClose = false;
          this.sessions.evict(sessionId);
        }
        send({ type: 'error', message: errorMessage ?? 'Prompt failed' });
      } finally {
        for (const stop of unsubscribe) stop();
        if (scheduleIdleClose) {
          this.sessions.scheduleIdleClose(sessionId, BACKGROUND_CONTEXT);
        }
      }
    });

    await onFinished?.({ status: finishStatus, errorMessage });
  }

  async resumeSession(
    sessionId: string,
    meta: AgentSessionMeta,
    input: AgentResumeParams,
    context: Context,
  ): Promise<AgentResumeResponse> {
    try {
      const { lane } = await this.sessions.get(meta, context);
      const result = await runLaneResume(lane, input, context);
      if (result.status !== 'suspended') {
        this.sessions.scheduleIdleClose(sessionId, context);
      }
      return result;
    } catch (error) {
      if (error instanceof AgentRuntimeError) {
        throw getAgentErrors().business(error.message);
      }
      throw error;
    }
  }

  async closeSession(sessionId: string, context: Context): Promise<void> {
    const { meta, hadHarness } = await this.sessions.close(sessionId, context);
    if (hadHarness && meta) {
      void this.observability.onHarnessIdleClosed(toObservabilityContext(meta as AgentSessionMeta));
    }
  }

  closeAll(context: Context): Promise<void> {
    return this.sessions.closeAll(context);
  }

  evict(sessionId: string): void {
    this.sessions.evict(sessionId);
  }
}
