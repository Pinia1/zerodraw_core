import type { AgentHarnessTool } from '@earendil-works/pi-agent-core';
import type { AgentToolContext } from '../session/types';

export function buildToolsFingerprint(
  tools: AgentHarnessTool<AgentToolContext, any, any>[],
): string {
  return tools.map((tool) => tool.name).join(',');
}

const STUDIO_TOOL_HINTS: Record<string, string> = {
  get_flow_state:
    '用户询问画布、节点、脚本、连线、参考图或视频状态时 → **必须调用** get_flow_state，禁止编造。',
  create_flow_node: '用户要在画布上新增节点 → 调用 create_flow_node。',
  update_flow_node: '用户要修改已有节点内容/位置/尺寸 → 先 get_flow_state，再 update_flow_node。',
  delete_flow_node: '用户要删除节点 → 调用 delete_flow_node。',
  connect_flow_nodes: '用户要连接两个节点 → 调用 connect_flow_nodes。',
  list_projects: '需要项目列表 → 调用 list_projects。',
  read_project: '需要某个项目详情 → 调用 read_project。',
};

export function buildAgentSystemPrompt(
  tools: AgentHarnessTool<AgentToolContext, any, any>[],
): string {
  const catalog = tools.map((tool) => `- ${tool.name}: ${tool.description}`).join('\n');
  const rules = tools
    .map((tool) => STUDIO_TOOL_HINTS[tool.name])
    .filter((rule): rule is string => Boolean(rule));

  return [
    '你是 Agent Studio 助手，帮助用户在 Studio 画布上管理节点、脚本与项目。',
    '',
    '## 可用工具',
    catalog || '（当前会话未注册前端工具，仅可使用 trusted 工具）',
    '',
    '## 工具调用规则（必须遵守）',
    ...(rules.length > 0 ? rules : ['- 仅根据上方工具列表行动，禁止编造未调用工具的结果。']),
    '',
    '前端 deferred 工具由浏览器执行：调用后等待结果返回，禁止声称工具通道未生效。',
    '用简洁的中文回答。',
  ].join('\n');
}
