import { BACKGROUND_CONTEXT, type Context } from '@earendil-works/pi-agent-core';
import type {
  AgentCreateSessionParams,
  AgentFrontendToolCompleteParams,
  AgentListQuery,
  AgentResumeParams,
  AgentResumeResponse,
} from '@zeroDraw/api-contract';
import { BusinessError, ForbiddenError, NotFoundError } from '../../../utils/errors';
import { logger } from '../../../utils/logger';
import { agentRegister } from '../runtime/register';
import { frontendToolBridge } from '../tools/frontend';
import { readMainLaneTranscript, summarizeTranscriptRoles } from './history';
import { agentRepository } from './repository';
import type { AgentRuntime, AgentSessionMeta } from './types';

function toDto(meta: AgentSessionMeta) {
  return {
    id: meta.id,
    title: meta.title,
    status: meta.status,
    createdAt: meta.createdAt,
  };
}

class AgentService {
  async createSession(userId: number, input: AgentCreateSessionParams) {
    const meta = await agentRepository.create({ userId, title: input.title });
    return toDto(meta);
  }

  async listSessions(userId: number, query: AgentListQuery) {
    const { list, total, page, pageSize } = await agentRepository.list(
      userId,
      query.page,
      query.pageSize,
    );
    return { list: list.map(toDto), total, page, pageSize };
  }

  async getSession(id: string, userId: number) {
    const meta = await this.requireOwnedMeta(id, userId);
    const transcript = await readMainLaneTranscript(id);
    logger.info('[Agent] getSession transcript', {
      sessionId: id,
      count: transcript.length,
      roles: summarizeTranscriptRoles(transcript),
    });
    return { ...toDto(meta), transcript };
  }

  async markSuspended(id: string): Promise<void> {
    await agentRepository.updateStatus(id, 'suspended');
  }

  async markActive(id: string): Promise<void> {
    await agentRepository.updateStatus(id, 'active');
  }

  /** 浏览器完成 deferred 前端工具调用。 */
  async completeFrontendTool(
    id: string,
    userId: number,
    input: AgentFrontendToolCompleteParams,
  ): Promise<{ ok: true; delivered: boolean }> {
    await this.requireOwnedMeta(id, userId);
    const outcome = await frontendToolBridge.complete(id, input);
    if (outcome.status === 'not_found') {
      throw new BusinessError('未找到待完成的前端工具调用');
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
      throw new BusinessError('会话已关闭，无法恢复');
    }

    const { lane } = await this.getRuntime(id, userId, context);

    if (input.decision === 'reject') {
      const result = await lane.abort(context);
      if (!result.ok) {
        if (result.error._tag === 'NoActiveOperation') {
          throw new BusinessError('当前没有可拒绝的挂起操作');
        }
        throw new BusinessError(String(result.error));
      }
      await this.markActive(id);
      return { status: 'aborted', operationId: result.value.operationId };
    }

    const result = await lane.resume(context);
    if (!result.ok) {
      if (result.error._tag === 'NothingToResume') {
        throw new BusinessError('当前没有可恢复的挂起操作');
      }
      throw new BusinessError(String(result.error));
    }

    const value = result.value;
    if ('status' in value && value.status === 'suspended') {
      await this.markSuspended(id);
      return { status: 'suspended', operationId: value.operationId };
    }

    const outcome = value as { operationId: string; status: 'completed' | 'declined' | 'aborted' | 'failed' };
    await this.markActive(id);
    if (outcome.status === 'aborted') {
      return { status: 'aborted', operationId: outcome.operationId };
    }
    if (outcome.status === 'failed') {
      return { status: 'failed', operationId: outcome.operationId };
    }
    return { status: 'completed', operationId: outcome.operationId };
  }

  /** 归属校验后取会话元数据（越权→403，不存在→404）。 */
  private async requireOwnedMeta(id: string, userId: number): Promise<AgentSessionMeta> {
    const owner = await agentRepository.findOwner(id);
    if (!owner) throw new NotFoundError();
    if (owner.userId !== userId) throw new ForbiddenError();
    const meta = await agentRepository.findById(id);
    if (!meta) throw new NotFoundError();
    return meta;
  }

  /** 取（并惰性打开）会话运行时的 harness/lane，供 prompt/resume 使用。 */
  async getRuntime(
    id: string,
    userId: number,
    context: Context = BACKGROUND_CONTEXT,
  ): Promise<AgentRuntime> {
    const meta = await this.requireOwnedMeta(id, userId);
    const runtime = await agentRegister.get(meta, context);
    return { harness: runtime.harness, lane: runtime.lane };
  }

  async closeSession(
    id: string,
    userId: number,
    context: Context = BACKGROUND_CONTEXT,
  ): Promise<string> {
    await this.requireOwnedMeta(id, userId);
    await frontendToolBridge.clearSession(id);
    await agentRegister.close(id, context);
    await agentRepository.updateStatus(id, 'closed');
    return id;
  }

  async closeAll(): Promise<void> {
    await agentRegister.closeAll(BACKGROUND_CONTEXT);
  }
}

export const agentService = new AgentService();
