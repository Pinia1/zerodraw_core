import { BACKGROUND_CONTEXT, withAbortSignal, type Context } from '@earendil-works/pi-agent-core';
import type { AgentResumeParams, AgentResumeResponse } from '@zeroDraw/api-contract';
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
import type { AgentDeps } from '../../tools';
import type { FrontendToolBridge } from '../../tools/frontend/bridge';
import { createAgentToolContext, type AgentSessionMeta } from '../../session/types';
import { createApiHarnessSessionStore } from '../harness-store';
import type { AgentRuntimeHost, AgentStreamPromptOptions } from './types';

export class InProcessRuntimeHost implements AgentRuntimeHost {
  readonly mode = 'inprocess' as const;

  private readonly sessions;

  constructor(
    private readonly deps: AgentDeps,
    frontendToolBridge: FrontendToolBridge,
    toolingCatalog: AgentToolingCatalog,
  ) {
    this.sessions = createApiHarnessSessionStore(toolingCatalog, {
      createToolContext: (meta) =>
        createAgentToolContext({
          userId: meta.userId,
          sessionId: meta.id,
          deps: this.deps,
          frontendTools: frontendToolBridge,
        }),
    });
  }

  async streamPrompt(options: AgentStreamPromptOptions): Promise<void> {
    const { sessionId, meta, message, images, raw, corsOrigin, markSuspended, markActive } =
      options;

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

      try {
        const result = await runLanePrompt(lane, message, images, context);
        if (result.suspended) {
          await markSuspended(sessionId);
          send({ type: 'suspended', operationId: result.operationId });
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'HarnessFault') {
          this.sessions.evict(sessionId);
        }
        send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
      } finally {
        for (const stop of unsubscribe) stop();
      }
    });
  }

  async resumeSession(
    _sessionId: string,
    meta: AgentSessionMeta,
    input: AgentResumeParams,
    context: Context,
  ): Promise<AgentResumeResponse> {
    try {
      const { lane } = await this.sessions.get(meta, context);
      return await runLaneResume(lane, input, context);
    } catch (error) {
      if (error instanceof AgentRuntimeError) {
        throw getAgentErrors().business(error.message);
      }
      throw error;
    }
  }

  closeSession(sessionId: string, context: Context): Promise<void> {
    return this.sessions.close(sessionId, context);
  }

  closeAll(context: Context): Promise<void> {
    return this.sessions.closeAll(context);
  }

  evict(sessionId: string): void {
    this.sessions.evict(sessionId);
  }
}
