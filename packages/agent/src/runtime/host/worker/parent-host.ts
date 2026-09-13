import { fork, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BACKGROUND_CONTEXT, type Context } from '@earendil-works/pi-agent-core';
import type { AgentResumeParams, AgentResumeResponse } from '@zeroDraw/api-contract';
import {
  mapHarnessEventToSseFrame,
  withAgentSseStream,
  type AgentSessionMeta,
} from '@zeroDraw/agent-worker/runtime';
import {
  createWorkerRequestId,
  isWorkerChildMessage,
  type WorkerChildMessage,
  type WorkerParentMessage,
} from '@zeroDraw/agent-worker/worker';
import { getAgentErrors, getAgentLogger, getAgentModuleConfig } from '../../../config';
import type { AgentDeps } from '../../../tools';
import type { FrontendToolBridge } from '../../../tools/frontend/bridge';
import { HostToolExecutor } from '../tool-executor';
import type { AgentRuntimeHost, AgentStreamPromptOptions } from '../types';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

interface PromptHandlers {
  onEvent: (message: Extract<WorkerChildMessage, { type: 'prompt_event' }>) => void;
  onFinished: (message: Extract<WorkerChildMessage, { type: 'prompt_finished' }>) => void;
}

function resolveWorkerEntry(): string {
  const configured = getAgentModuleConfig().workerEntryPath;
  if (configured) {
    if (existsSync(configured)) return configured;
    const js = configured.replace(/\.ts$/, '.js');
    if (existsSync(js)) return js;
    return configured;
  }
  const dir = dirname(fileURLToPath(import.meta.url));
  const js = join(dir, 'agent.worker.js');
  if (existsSync(js)) return js;
  return join(dir, 'agent.worker.ts');
}

export class WorkerRuntimeHost implements AgentRuntimeHost {
  readonly mode = 'worker' as const;
  private child: ChildProcess | null = null;
  private ready = false;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly promptHandlers = new Map<string, PromptHandlers>();
  private readonly toolExecutor: HostToolExecutor;

  constructor(deps: AgentDeps, frontendToolBridge: FrontendToolBridge) {
    this.toolExecutor = new HostToolExecutor(frontendToolBridge, deps);
  }

  async streamPrompt(options: AgentStreamPromptOptions): Promise<void> {
    const { sessionId, meta, message, images, raw, corsOrigin, markSuspended, markActive } =
      options;

    await this.ensureWorkerReady();

    await withAgentSseStream(raw, corsOrigin, async ({ send }) => {
      const requestId = createWorkerRequestId();

      getAgentLogger().info('[Agent LLM] prompt', {
        sessionId,
        message,
        imageCount: images?.length ?? 0,
        host: this.mode,
      });

      await new Promise<void>((resolve, reject) => {
        this.promptHandlers.set(requestId, {
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
            if (!finishedMessage.ok) {
              send({ type: 'error', message: finishedMessage.error ?? 'Worker prompt failed' });
            } else if (finishedMessage.suspended) {
              void markSuspended(sessionId);
              send({ type: 'suspended', operationId: finishedMessage.operationId });
            }
            resolve();
          },
        });

        try {
          this.sendToWorker({ type: 'prompt', requestId, meta, message, images });
        } catch (error) {
          this.promptHandlers.delete(requestId);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      }).catch((error) => {
        send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
      }).finally(() => {
        this.promptHandlers.delete(requestId);
      });
    });
  }

  async resumeSession(
    _sessionId: string,
    meta: AgentSessionMeta,
    input: AgentResumeParams,
    _context: Context,
  ): Promise<AgentResumeResponse> {
    await this.ensureWorkerReady();
    const requestId = createWorkerRequestId();
    const resultPromise = this.waitFor<Extract<WorkerChildMessage, { type: 'resume_result' }>>(
      requestId,
    );
    this.sendToWorker({ type: 'resume', requestId, meta, input });
    const result = await resultPromise;
    if (!result.ok || !result.result) {
      throw getAgentErrors().business(result.error ?? 'Worker resume failed');
    }
    return result.result;
  }

  async closeSession(sessionId: string, _context: Context): Promise<void> {
    if (!this.child || !this.ready) return;
    const requestId = createWorkerRequestId();
    const resultPromise = this.waitFor<Extract<WorkerChildMessage, { type: 'close_session_result' }>>(
      requestId,
    );
    this.sendToWorker({ type: 'close_session', requestId, sessionId });
    const result = await resultPromise;
    if (!result.ok) {
      throw getAgentErrors().business(result.error ?? 'Worker close session failed');
    }
  }

  async closeAll(_context: Context): Promise<void> {
    if (!this.child) return;
    this.sendToWorker({ type: 'shutdown' });
    this.child.kill('SIGTERM');
    this.child = null;
    this.ready = false;
  }

  evict(sessionId: string): void {
    void this.closeSession(sessionId, BACKGROUND_CONTEXT).catch(() => undefined);
  }

  private async ensureWorkerReady(): Promise<void> {
    if (this.child && this.ready) return;

    if (this.child) {
      this.child.kill('SIGTERM');
      this.child = null;
      this.ready = false;
    }

    const entry = resolveWorkerEntry();
    const isTs = entry.endsWith('.ts');
    this.child = fork(entry, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: { ...process.env, AGENT_WORKER_CHILD: '1' },
      execArgv: isTs ? ['--import', 'tsx'] : process.execArgv,
    });

    this.child.stdout?.on('data', (chunk) => {
      getAgentLogger().debug('[Agent Worker stdout]', { text: String(chunk) });
    });
    this.child.stderr?.on('data', (chunk) => {
      getAgentLogger().warn('[Agent Worker stderr]', { text: String(chunk) });
    });

    this.child.on('exit', (code, signal) => {
      getAgentLogger().error('[Agent Worker] exited', undefined, { code, signal });
      this.ready = false;
      this.child = null;
      for (const [id, pending] of this.pending.entries()) {
        pending.reject(new Error('Agent worker 进程已退出'));
        this.pending.delete(id);
      }
      this.promptHandlers.clear();
    });

    this.child.on('message', (message: unknown) => {
      if (!isWorkerChildMessage(message)) return;
      void this.dispatchChildMessage(message);
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Agent worker 启动超时')), 30_000);
      const onReady = (message: unknown) => {
        if (!isWorkerChildMessage(message) || message.type !== 'ready') return;
        clearTimeout(timeout);
        this.child?.off('message', onReady);
        this.ready = true;
        resolve();
      };
      this.child?.on('message', onReady);
    });
  }

  private async dispatchChildMessage(message: WorkerChildMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
      case 'worker_error':
        if (message.type === 'worker_error') {
          getAgentLogger().error('[Agent Worker] error', undefined, { message: message.message });
        }
        return;
      case 'tool_execute':
        await this.executeToolOnHost(message);
        return;
      case 'prompt_event':
        this.promptHandlers.get(message.requestId)?.onEvent(message);
        return;
      case 'prompt_finished':
        this.promptHandlers.get(message.requestId)?.onFinished(message);
        return;
      case 'resume_result':
      case 'close_session_result':
        this.resolvePending(message.requestId, message);
        return;
      default:
        return;
    }
  }

  private async executeToolOnHost(message: Extract<WorkerChildMessage, { type: 'tool_execute' }>) {
    try {
      const result = await this.toolExecutor.execute({
        sessionId: message.sessionId,
        userId: message.userId,
        toolName: message.toolName,
        toolCallId: message.toolCallId,
        params: message.params,
      });
      this.sendToWorker({ type: 'tool_result', requestId: message.requestId, ok: true, result });
    } catch (error) {
      this.sendToWorker({
        type: 'tool_result',
        requestId: message.requestId,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private sendToWorker(message: WorkerParentMessage): void {
    if (!this.child?.connected) {
      throw new Error('Agent worker 未连接');
    }
    this.child.send(message);
  }

  private waitFor<T>(requestId: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(requestId)) {
          reject(new Error('Worker 请求超时'));
        }
      }, 120_000);

      this.pending.set(requestId, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value as T);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
  }

  private resolvePending(requestId: string, message: unknown): void {
    const pending = this.pending.get(requestId);
    if (!pending) return;
    this.pending.delete(requestId);
    pending.resolve(message);
  }
}
