import { BACKGROUND_CONTEXT, withAbortSignal } from '@earendil-works/pi-agent-core';
import type { ImageContent } from '@earendil-works/pi-ai';
import type { Storage } from '@earendil-works/pi-agent-core';
import type { AgentResumeParams } from '@zeroDraw/api-contract';
import {
  HarnessSessionStore,
  attachHarnessEventForwarder,
  createIsolatedToolContext,
  runLanePrompt,
  runLaneResume,
  type AgentSessionMeta,
  type AgentToolingCatalog,
  type IsolatedAgentToolContext,
} from '../runtime';
import { getAgentRuntimeLogger } from '../runtime/types/logger';
import type { WorkerChildMessage, WorkerParentMessage } from './protocol';
import { WorkerToolIpcBridge } from './ipc-tools';

type PostMessage = (message: WorkerChildMessage) => void;

export interface AgentWorkerChildConfig {
  tooling: AgentToolingCatalog;
  createStorage: (meta: AgentSessionMeta) => Storage;
}

export class AgentWorkerChildRuntime {
  private readonly ipcTools = new WorkerToolIpcBridge((message) => this.post(message));
  private readonly sessions: HarnessSessionStore<AgentSessionMeta, IsolatedAgentToolContext>;

  constructor(
    private readonly post: PostMessage,
    config: AgentWorkerChildConfig,
  ) {
    this.sessions = new HarnessSessionStore<AgentSessionMeta, IsolatedAgentToolContext>(config.tooling, {
      wrapTools: (tools) => this.ipcTools.wrapTools(tools),
      createToolContext: createIsolatedToolContext,
      createStorage: config.createStorage,
    });
  }

  async handle(message: WorkerParentMessage): Promise<void> {
    switch (message.type) {
      case 'prompt':
        await this.handlePrompt(message.requestId, message.meta, message.message, message.images);
        return;
      case 'resume':
        await this.handleResume(message.requestId, message.meta, message.input);
        return;
      case 'close_session':
        await this.handleCloseSession(message.requestId, message.sessionId);
        return;
      case 'tool_result':
        this.ipcTools.resolveToolResult(
          message.requestId,
          message.ok,
          message.result,
          message.error,
        );
        return;
      case 'shutdown':
        await this.shutdown();
        return;
      default:
        return;
    }
  }

  private async handlePrompt(
    requestId: string,
    meta: AgentSessionMeta,
    message: string,
    images?: ImageContent[],
  ): Promise<void> {
    const sessionId = meta.id;
    try {
      const { harness, lane } = await this.sessions.get(meta, BACKGROUND_CONTEXT);
      const context = withAbortSignal(new AbortController().signal, BACKGROUND_CONTEXT);

      const stops = attachHarnessEventForwarder(
        harness,
        (eventName, payload) => {
          this.post({ type: 'prompt_event', requestId, event: eventName, payload });
        },
        () => this.sessions.evict(sessionId),
      );

      getAgentRuntimeLogger().info('[Agent Worker] prompt', {
        sessionId,
        imageCount: images?.length ?? 0,
      });

      const result = await runLanePrompt(lane, message, images, context);
      for (const stop of stops) stop();

      this.post({
        type: 'prompt_finished',
        requestId,
        ok: true,
        suspended: result.suspended,
        operationId: result.operationId,
      });
    } catch (error) {
      this.post({
        type: 'prompt_finished',
        requestId,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleResume(
    requestId: string,
    meta: AgentSessionMeta,
    input: AgentResumeParams,
  ): Promise<void> {
    try {
      const { lane } = await this.sessions.get(meta, BACKGROUND_CONTEXT);
      const result = await runLaneResume(lane, input, BACKGROUND_CONTEXT);
      this.post({ type: 'resume_result', requestId, ok: true, result });
    } catch (error) {
      this.post({
        type: 'resume_result',
        requestId,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleCloseSession(requestId: string, sessionId: string): Promise<void> {
    try {
      await this.sessions.close(sessionId, BACKGROUND_CONTEXT);
      this.post({ type: 'close_session_result', requestId, ok: true });
    } catch (error) {
      this.post({
        type: 'close_session_result',
        requestId,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async shutdown(): Promise<void> {
    await this.sessions.closeAll(BACKGROUND_CONTEXT);
    process.exit(0);
  }
}
