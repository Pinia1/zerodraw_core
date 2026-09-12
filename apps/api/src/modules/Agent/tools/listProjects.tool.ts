import { Type } from '@earendil-works/pi-ai';
import type { AgentHarnessTool } from '@earendil-works/pi-agent-core';
import type { AgentToolContext } from '../session/types';

const ListProjectsToolParameters = Type.Object({
  page: Type.Integer({ minimum: 1, default: 1 }),
  pageSize: Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
  keyword: Type.Optional(Type.String()),
  deleted: Type.Optional(Type.Boolean()),
});

export function createListProjectsTool(): AgentHarnessTool<
  AgentToolContext,
  typeof ListProjectsToolParameters
> {
  return {
    name: 'list_projects',
    description: '列出当前用户的创作项目（分页）。需要知道用户有哪些项目时调用。',
    label: '列出项目',
    parameters: ListProjectsToolParameters,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async execute(_toolCallId, params, _onUpdate, toolContext, _invocation, _context) {
      const data = await toolContext.deps.project.listProjects({
        userId: toolContext.userId,
        page: params.page,
        pageSize: params.pageSize,
        keyword: params.keyword,
        deleted: params.deleted ?? false,
      });
      return { content: [{ type: 'text', text: JSON.stringify(data) }], details: data };
    },
  };
}
