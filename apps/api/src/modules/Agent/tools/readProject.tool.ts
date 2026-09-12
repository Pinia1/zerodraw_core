import { Type } from '@earendil-works/pi-ai';
import type { AgentHarnessTool } from '@earendil-works/pi-agent-core';
import type { AgentToolContext } from '../session/types';

const ReadProjectToolParameters = Type.Object({
  projectId: Type.String(),
});

export function createReadProjectTool(): AgentHarnessTool<
  AgentToolContext,
  typeof ReadProjectToolParameters
> {
  return {
    name: 'read_project',
    description: '读取指定项目的详情（含图层）。需要查看某个项目的内容时调用。',
    label: '读取项目',
    parameters: ReadProjectToolParameters,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async execute(_toolCallId, params, _onUpdate, toolContext, _invocation, _context) {
      const data = await toolContext.deps.project.getProject({
        id: params.projectId,
        userId: toolContext.userId,
      });
      return { content: [{ type: 'text', text: JSON.stringify(data) }], details: data };
    },
  };
}
