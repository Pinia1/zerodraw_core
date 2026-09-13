import {
  projectFlowStateSchema,
  type ProjectDetail,
  type ProjectFlowState,
  type ProjectItem,
} from '@zeroDraw/api-contract';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import type { ProjectRepository } from './project.repository';
import type {
  CreateProjectParams,
  DeleteProjectParams,
  GetProjectParams,
  ListProjectParams,
  SaveProjectFlowParams,
  UpdateProjectParams,
} from './project.type';

function parseFlowState(raw: unknown): ProjectFlowState | null {
  if (raw == null) return null;
  const parsed = projectFlowStateSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async listProjects({ userId, page, pageSize, keyword, deleted }: ListProjectParams) {
    const [total, list] = await Promise.all([
      this.projectRepository.count(userId, !!deleted, keyword),
      this.projectRepository.findMany({ userId, page, pageSize, keyword, deleted }),
    ]);
    return { list: list as ProjectItem[], total, page, pageSize };
  }

  async getProject({ id, userId }: GetProjectParams): Promise<ProjectDetail> {
    const row = await this.projectRepository.findById(id);
    if (!row) throw new NotFoundError();

    const owner = await this.projectRepository.findOwner(id);
    if (owner?.userId !== userId) throw new ForbiddenError();

    return {
      ...row,
      flowState: parseFlowState(row.flowState),
    };
  }

  async saveProjectFlow({ id, userId, nodes, edges, viewport }: SaveProjectFlowParams) {
    const owner = await this.projectRepository.findOwner(id);
    if (!owner || owner.deletedAt) throw new NotFoundError();
    if (owner.userId !== userId) throw new ForbiddenError();

    const flowState = projectFlowStateSchema.parse({ nodes, edges, viewport });
    await this.projectRepository.update(id, {
      flowState,
      updatedAt: new Date(),
    });
    return id;
  }

  async createProject({
    userId,
    name,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    backgroundVisible,
    thumbnailKey,
  }: CreateProjectParams) {
    const id = crypto.randomUUID();
    const row = await this.projectRepository.create({
      id,
      userId,
      name,
      canvasWidth,
      canvasHeight,
      backgroundColor,
      backgroundVisible,
      ...(thumbnailKey ? { thumbnailKey } : {}),
    });
    return row as ProjectItem;
  }

  async updateProject({ id, userId, ...fields }: UpdateProjectParams) {
    const owner = await this.projectRepository.findOwner(id);
    if (!owner || owner.deletedAt) throw new NotFoundError();
    if (owner.userId !== userId) throw new ForbiddenError();

    const updateData: Record<string, unknown> = {};
    if (fields.name !== undefined) updateData.name = fields.name;
    if (fields.thumbnailKey !== undefined) updateData.thumbnailKey = fields.thumbnailKey;
    if (fields.canvasWidth !== undefined) updateData.canvasWidth = fields.canvasWidth;
    if (fields.canvasHeight !== undefined) updateData.canvasHeight = fields.canvasHeight;
    if (fields.backgroundColor !== undefined) updateData.backgroundColor = fields.backgroundColor;
    if (fields.backgroundVisible !== undefined) updateData.backgroundVisible = fields.backgroundVisible;

    if (Object.keys(updateData).length > 0) {
      await this.projectRepository.update(id, updateData);
    }
    return id;
  }

  async deleteProject({ id, userId }: DeleteProjectParams) {
    const owner = await this.projectRepository.findOwner(id);
    if (!owner || owner.deletedAt) throw new NotFoundError();
    if (owner.userId !== userId) throw new ForbiddenError();

    await this.projectRepository.softDelete(id);
    return id;
  }

  async restoreProject({ id, userId }: DeleteProjectParams) {
    const owner = await this.projectRepository.findOwner(id);
    if (!owner || !owner.deletedAt) throw new NotFoundError();
    if (owner.userId !== userId) throw new ForbiddenError();

    await this.projectRepository.restore(id);
    return id;
  }

  async permanentDeleteProject({ id, userId }: DeleteProjectParams) {
    const owner = await this.projectRepository.findOwner(id);
    if (!owner) throw new NotFoundError();
    if (owner.userId !== userId) throw new ForbiddenError();

    await this.projectRepository.permanentDelete(id);
    return id;
  }
}
