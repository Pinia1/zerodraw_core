import { fork, type ChildProcess } from 'node:child_process';
import type { AgentResumeParams, AgentResumeResponse } from '@zeroDraw/api-contract';
import {
  createWorkerRequestId,
  isWorkerChildMessage,
  type HarnessLifecycleEvent,
  type WorkerChildMessage,
  type WorkerParentMessage,
} from '@zeroDraw/agent-worker/worker';
import type { ImageContent } from '@earendil-works/pi-ai';
import type { AgentSessionMeta } from '@zeroDraw/agent-worker/runtime';
import { getAgentLogger } from '../../../config';
import type { HostToolExecutor } from '../tool-executor';
import { resolveWorkerEntry } from './resolve-entry';

export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

export interface PromptHandlers {
  onEvent: (message: Extract<WorkerChildMessage, { type: 'prompt_event' }>) => void;
  onFinished: (message: Extract<WorkerChildMessage, { type: 'prompt_finished' }>) => void;
}

export type WorkerSlotCrashHandler = (slotId: number) => void;

export interface HarnessLifecycleMessage {
  sessionId: string;
  event: HarnessLifecycleEvent;
  meta: AgentSessionMeta;
  workerSlot: number;
}

export type HarnessLifecycleHandler = (message: HarnessLifecycleMessage) => void;

/** 单个 fork 子进程及其 IPC 状态 */
export class AgentWorkerSlot {
  boundSessions = 0;

  private child: ChildProcess | null = null;
  private ready = false;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly promptHandlers = new Map<string, PromptHandlers>();

  constructor(
    readonly id: number,
    private readonly toolExecutor: HostToolExecutor,
    private readonly onCrash: WorkerSlotCrashHandler,
    private readonly onHarnessLifecycle?: HarnessLifecycleHandler,
  ) {}

  async ensureReady(): Promise<void> {
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
      env: { ...process.env, AGENT_WORKER_CHILD: '1', AGENT_WORKER_SLOT: String(this.id) },
      execArgv: isTs ? ['--import', 'tsx'] : process.execArgv,
    });

    this.child.stdout?.on('data', (chunk) => {
      getAgentLogger().debug('[Agent Worker stdout]', { slotId: this.id, text: String(chunk) });
    });
    this.child.stderr?.on('data', (chunk) => {
      getAgentLogger().warn('[Agent Worker stderr]', { slotId: this.id, text: String(chunk) });
    });

    this.child.on('exit', (code, signal) => {
      getAgentLogger().error('[Agent Worker] exited', undefined, { slotId: this.id, code, signal });
      this.handleCrash();
    });

    this.child.on('message', (message: unknown) => {
      if (!isWorkerChildMessage(message)) return;
      void this.dispatchChildMessage(message);
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Agent worker #${this.id} 启动超时`)), 30_000);
      const onReady = (message: unknown) => {
        if (!isWorkerChildMessage(message) || message.type !== 'ready') return;
        clearTimeout(timeout);
        this.child?.off('message', onReady);
        this.ready = true;
        getAgentLogger().info('[Agent Worker] ready', { slotId: this.id });
        resolve();
      };
      this.child?.on('message', onReady);
    });
  }

  sendPrompt(
    meta: AgentSessionMeta,
    message: string,
    images: ImageContent[] | undefined,
    handlers: PromptHandlers,
  ): string {
    const requestId = createWorkerRequestId();
    this.promptHandlers.set(requestId, handlers);
    this.sendToWorker({ type: 'prompt', requestId, meta, message, images });
    return requestId;
  }

  clearPromptHandler(requestId: string): void {
    this.promptHandlers.delete(requestId);
  }

  async resume(
    meta: AgentSessionMeta,
    input: AgentResumeParams,
  ): Promise<Extract<WorkerChildMessage, { type: 'resume_result' }>> {
    const requestId = createWorkerRequestId();
    const resultPromise = this.waitFor<Extract<WorkerChildMessage, { type: 'resume_result' }>>(
      requestId,
    );
    this.sendToWorker({ type: 'resume', requestId, meta, input });
    return resultPromise;
  }

  async closeSession(sessionId: string): Promise<void> {
    if (!this.child || !this.ready) return;
    const requestId = createWorkerRequestId();
    const resultPromise = this.waitFor<Extract<WorkerChildMessage, { type: 'close_session_result' }>>(
      requestId,
    );
    this.sendToWorker({ type: 'close_session', requestId, sessionId });
    const result = await resultPromise;
    if (!result.ok) {
      throw new Error(result.error ?? 'Worker close session failed');
    }
  }

  shutdown(): void {
    if (!this.child) return;
    try {
      this.sendToWorker({ type: 'shutdown' });
    } catch {
      // 进程可能已断开
    }
    this.child.kill('SIGTERM');
    this.child = null;
    this.ready = false;
  }

  private handleCrash(): void {
    this.ready = false;
    this.child = null;
    for (const [id, pending] of this.pending.entries()) {
      pending.reject(new Error(`Agent worker #${this.id} 进程已退出`));
      this.pending.delete(id);
    }
    this.promptHandlers.clear();
    this.onCrash(this.id);
  }

  private async dispatchChildMessage(message: WorkerChildMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
      case 'worker_error':
        if (message.type === 'worker_error') {
          getAgentLogger().error('[Agent Worker] error', undefined, {
            slotId: this.id,
            message: message.message,
          });
        }
        return;
      case 'tool_execute':
        await this.executeToolOnHost(message);
        return;
      case 'harness_lifecycle':
        this.onHarnessLifecycle?.({
          sessionId: message.sessionId,
          event: message.event,
          meta: message.meta,
          workerSlot: this.id,
        });
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
      throw new Error(`Agent worker #${this.id} 未连接`);
    }
    this.child.send(message);
  }

  private waitFor<T>(requestId: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(requestId)) {
          reject(new Error(`Worker #${this.id} 请求超时`));
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

export type { AgentResumeResponse };
