import type { AgentHarnessTool } from '@earendil-works/pi-agent-core';
import { generateService } from '../../AIGenerate/generate.services';
import { projectService } from '../../Project/project.services';
import type { AgentToolContext } from '../session/types';
import { createGenerateImageTool } from './generateImage.tool';
import { createListProjectsTool } from './listProjects.tool';
import { createReadProjectTool } from './readProject.tool';

/** Agent 工具可调用的业务服务集合（集中注册，便于 mock / 扩展）。 */
export interface AgentDeps {
  project: Pick<typeof projectService, 'listProjects' | 'getProject'>;
  generate: Pick<typeof generateService, 'run'>;
}

/** 默认生产环境依赖（各 module service 单例）。 */
export const agentDeps: AgentDeps = {
  project: projectService,
  generate: generateService,
};

/** 注册全部 Agent 工具（新增 tool 时在此追加）。 */
export function createAgentTools(): AgentHarnessTool<AgentToolContext, any, any>[] {
  return [createListProjectsTool(), createReadProjectTool(), createGenerateImageTool()];
}

export { createGenerateImageTool } from './generateImage.tool';
export { createListProjectsTool } from './listProjects.tool';
export { createReadProjectTool } from './readProject.tool';
