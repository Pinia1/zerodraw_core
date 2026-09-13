import { BACKGROUND_CONTEXT } from '@earendil-works/pi-agent-core';
import { pickAgentCapabilities, type AgentCapabilityMap } from '../../framework';
import { getAgentDeps } from '../../config';
import { createAgentToolContext } from '../../session/types';
import { createAgentTools, type AgentDeps } from '../../tools';
import type { FrontendToolBridge } from '../../tools/frontend/bridge';
import type { AgentRepository } from '../../session/repository';

/** 主进程侧工具执行器：worker 模式下由 IPC 回调到这里 */
export class HostToolExecutor {
  private readonly deps: AgentDeps;

  constructor(
    private readonly frontendToolBridge: FrontendToolBridge,
    private readonly repository: AgentRepository,
    deps?: AgentDeps,
  ) {
    this.deps = deps ?? getAgentDeps();
  }

  async prepareFrontendTool(input: {
    sessionId: string;
    toolName: string;
    toolCallId: string;
    params: unknown;
  }): Promise<void> {
    const meta = await this.repository.findById(input.sessionId);
    const tools = createAgentTools({ clientTools: meta?.clientTools });
    const tool = tools.find((item) => item.name === input.toolName);
    if (!tool || tool.kind !== 'frontend') return;

    await this.frontendToolBridge.preparePending(
      input.sessionId,
      input.toolCallId,
      input.toolName,
      input.params,
    );
  }

  async execute(input: {
    sessionId: string;
    userId: number;
    toolName: string;
    toolCallId: string;
    params: unknown;
  }) {
    const meta = await this.repository.findById(input.sessionId);
    const tools = createAgentTools({ clientTools: meta?.clientTools });
    const tool = tools.find((item) => item.name === input.toolName);
    if (!tool) {
      throw new Error(`未知工具: ${input.toolName}`);
    }

    if (tool.kind === 'frontend') {
      await this.frontendToolBridge.preparePending(
        input.sessionId,
        input.toolCallId,
        input.toolName,
        input.params,
      );
    }

    const fullContext = createAgentToolContext({
      userId: input.userId,
      sessionId: input.sessionId,
      deps: this.deps,
      frontendTools: this.frontendToolBridge,
    });

    const narrowed = {
      ...fullContext,
      capabilities: pickAgentCapabilities(
        fullContext.capabilities as AgentCapabilityMap,
        tool.capabilities,
      ),
    };

    return tool.execute(
      input.toolCallId,
      input.params as never,
      () => undefined,
      narrowed,
      undefined as never,
      BACKGROUND_CONTEXT,
    );
  }
}
