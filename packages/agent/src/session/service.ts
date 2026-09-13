import { BACKGROUND_CONTEXT, type Context } from '@earendil-works/pi-agent-core';
import type {
  AgentCloseReason,
  AgentCreateSessionParams,
  AgentFrontendToolCompleteParams,
  AgentListQuery,
  AgentResumeParams,
  AgentResumeResponse,
} from '@zeroDraw/api-contract';
import { getAgentEnv, getAgentErrors, getAgentLogger } from '../config';
import {
  AgentObservabilityService,
  startPromptRunScope,
  toObservabilityContext,
  withPromptRun,
} from '../observability';
import type { AgentRuntimeHost, AgentStreamPromptOptions } from '../runtime/host/types';
import type { FrontendToolBridge } from '../tools/frontend/bridge';
import { readMainLaneTranscript, summarizeTranscriptRoles } from './history';
import type { AgentRepository } from './repository';
import type { AgentSessionMeta } from './types';

function toDto(meta: AgentSessionMeta) {
  return {
    id: meta.id,
    title: meta.title,
    status: meta.status,
    createdAt: meta.createdAt,
  };
}

export interface AgentServiceDeps {
  repository: AgentRepository;
  runtimeHost: AgentRuntimeHost;
  frontendToolBridge: FrontendToolBridge;
  observability: AgentObservabilityService;
}

export class AgentService {
  constructor(private readonly deps: AgentServiceDeps) {}

  async createSession(userId: number, input: AgentCreateSessionParams) {
    const meta = await this.deps.repository.create({
      userId,
      title: input.title,
      projectId: input.projectId,
      runtimeHost: getAgentEnv().AGENT_RUNTIME_HOST,
      clientTools: input.clientTools,
    });
    await this.deps.observability.onSessionCreated({
      ...toObservabilityContext(meta),
      title: meta.title ?? null,
    });
    return toDto(meta);
  }

  async listSessions(userId: number, query: AgentListQuery) {
    const { list, total, page, pageSize } = await this.deps.repository.list(
      userId,
      query.page,
      query.pageSize,
    );
    return { list: list.map(toDto), total, page, pageSize };
  }

  async getSession(id: string, userId: number) {
    const meta = await this.requireOwnedMeta(id, userId);
    const transcript = await readMainLaneTranscript(id);
    getAgentLogger().info('[Agent] getSession transcript', {
      sessionId: id,
      count: transcript.length,
      roles: summarizeTranscriptRoles(transcript),
    });
    return { ...toDto(meta), transcript };
  }

  async markSuspended(id: string): Promise<void> {
    await this.deps.repository.updateStatus(id, 'suspended');
    const meta = await this.deps.repository.findById(id);
    if (meta) await this.deps.observability.onSessionSuspended(toObservabilityContext(meta));
  }

  async markActive(id: string): Promise<void> {
    await this.deps.repository.updateStatus(id, 'active');
  }

  /** SSE 流式 prompt（harness 在 inprocess 或 worker 中运行）。 */
  async streamPrompt(
    id: string,
    userId: number,
    options: Omit<AgentStreamPromptOptions, 'sessionId' | 'meta'>,
  ): Promise<void> {
    const meta = await this.requireOwnedMeta(id, userId);
    const ctx = toObservabilityContext(meta);
    const scope = await startPromptRunScope(this.deps.observability, ctx, {
      runtimeHost: this.deps.runtimeHost.mode,
      kind: 'prompt',
    });

    try {
      await this.deps.runtimeHost.streamPrompt({
        sessionId: id,
        meta,
        ...options,
        onFinished: (result) =>
          scope.finish({
            status: result.status,
            errorMessage: result.errorMessage,
          }),
      });
    } catch (error) {
      await scope.finish({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /** 浏览器完成 deferred 前端工具调用。 */
  async completeFrontendTool(
    id: string,
    userId: number,
    input: AgentFrontendToolCompleteParams,
  ): Promise<{ ok: true; delivered: boolean }> {
    await this.requireOwnedMeta(id, userId);
    const outcome = await this.deps.frontendToolBridge.complete(id, input);
    if (outcome.status === 'not_found') {
      throw getAgentErrors().business('未找到待完成的前端工具调用');
    }
    return { ok: true, delivered: outcome.delivered };
  }

  /** 放行或拒绝被挂起的 deferred 操作。 */
  async resumeSession(
    id: string,
    userId: number,
    input: AgentResumeParams,
    context: Context = BACKGROUND_CONTEXT,
  ): Promise<AgentResumeResponse> {
    const meta = await this.requireOwnedMeta(id, userId);
    if (meta.status === 'closed') {
      throw getAgentErrors().business('会话已关闭，无法恢复');
    }

    const ctx = toObservabilityContext(meta);
    const result = await withPromptRun(
      this.deps.observability,
      ctx,
      { runtimeHost: this.deps.runtimeHost.mode, kind: 'resume' },
      () => this.deps.runtimeHost.resumeSession(id, meta, input, context),
      (resumeResult) => ({ status: resumeResult.status }),
    );

    if (result.status !== 'failed' && result.status !== 'aborted') {
      await this.deps.observability.onSessionResumed(ctx);
    }

    if (result.status === 'suspended') {
      await this.markSuspended(id);
    } else {
      await this.markActive(id);
    }

    return result;
  }

  /** 归属校验后取会话元数据（越权→403，不存在→404）。 */
  private async requireOwnedMeta(id: string, userId: number): Promise<AgentSessionMeta> {
    const owner = await this.deps.repository.findOwner(id);
    const errors = getAgentErrors();
    if (!owner) throw errors.notFound();
    if (owner.userId !== userId) throw errors.forbidden();
    const meta = await this.deps.repository.findById(id);
    if (!meta) throw errors.notFound();
    return meta;
  }

  async closeSession(
    id: string,
    userId: number,
    context: Context = BACKGROUND_CONTEXT,
  ): Promise<string> {
    const meta = await this.requireOwnedMeta(id, userId);
    return this.closeSessionInternal(meta, 'user_close', context);
  }

  /** Admin 强制关闭（无需 user 归属校验）。 */
  async closeSessionAdmin(
    id: string,
    closeReason: AgentCloseReason = 'admin',
    context: Context = BACKGROUND_CONTEXT,
  ): Promise<string> {
    const meta = await this.deps.repository.findById(id);
    if (!meta) throw getAgentErrors().notFound();
    if (meta.status === 'closed') return id;
    return this.closeSessionInternal(meta, closeReason, context);
  }

  private async closeSessionInternal(
    meta: AgentSessionMeta,
    closeReason: AgentCloseReason,
    context: Context,
  ): Promise<string> {
    await this.deps.frontendToolBridge.clearSession(meta.id);
    await this.deps.runtimeHost.closeSession(meta.id, context);
    await this.deps.observability.onSessionClosed(toObservabilityContext(meta), closeReason);
    return meta.id;
  }

  async closeAll(): Promise<void> {
    await this.deps.runtimeHost.closeAll(BACKGROUND_CONTEXT);
  }
}
