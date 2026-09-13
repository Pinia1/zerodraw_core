import type { ProjectDetail } from '@zeroDraw/api-contract';

/** Agent 工具可调用的业务服务（由宿主通过 configureAgentModule 注入）。 */
export interface AgentDeps {
  project: {
    listProjects(query: {
      userId: number;
      page: number;
      pageSize: number;
      keyword?: string;
      deleted?: boolean;
    }): Promise<{ list: unknown[]; total: number; page: number; pageSize: number }>;
    getProject(query: { id: string; userId: number }): Promise<ProjectDetail>;
  };
}
