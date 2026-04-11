import type { ProjectDetail, ProjectItem, ProjectLayerDetail } from '@zeroDraw/api-contract';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { projectLayerRepository } from './projectLayer.repository';
import { projectRepository } from './project.repository';
import type {
  CreateProjectParams,
  DeleteProjectParams,
  GetProjectParams,
  ListProjectParams,
  SaveLayersParams,
  UpdateProjectParams,
} from './project.type';

class ProjectService {
  async listProjects({ userId, page, pageSize, keyword, deleted }: ListProjectParams) {
    const [total, list] = await Promise.all([
      projectRepository.count(userId, !!deleted, keyword),
      projectRepository.findMany({ userId, page, pageSize, keyword, deleted }),
    ]);
    return { list: list as ProjectItem[], total, page, pageSize };
  }

  async getProject({ id, userId }: GetProjectParams): Promise<ProjectDetail> {
    const row = await projectRepository.findById(id);
    if (!row) throw new NotFoundError();

    const owner = await projectRepository.findOwner(id);
    if (owner?.userId !== userId) throw new ForbiddenError();

    const layers = await projectLayerRepository.findByProjectId(id);

    return {
      ...row,
      layers: layers.map((l) => ({
        id: l.id,
        name: l.name,
        order: l.order,
        opacity: l.opacity,
        visible: l.visible,
        blendMode: l.blendMode,
        filter: (l.filter as any) ?? null,
        content: (l.content as any) ?? {},
      })) as ProjectLayerDetail[],
    };
  }

  async createProject({ userId, name, canvasWidth, canvasHeight, backgroundColor, backgroundVisible }: CreateProjectParams) {
    const id = crypto.randomUUID();
    const row = await projectRepository.create({ id, userId, name, canvasWidth, canvasHeight, backgroundColor, backgroundVisible });
    return row as ProjectItem;
  }

  async updateProject({ id, userId, ...fields }: UpdateProjectParams) {
    const owner = await projectRepository.findOwner(id);
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
      await projectRepository.update(id, updateData);
    }
    return id;
  }

  async saveLayers({ projectId, userId, layers }: SaveLayersParams) {
    const owner = await projectRepository.findOwner(projectId);
    if (!owner || owner.deletedAt) throw new NotFoundError();
    if (owner.userId !== userId) throw new ForbiddenError();

    await projectLayerRepository.deleteByProjectId(projectId);
    await projectLayerRepository.bulkInsert(projectId, layers);
    await projectRepository.touchUpdatedAt(projectId);

    return projectId;
  }

  async deleteProject({ id, userId }: DeleteProjectParams) {
    const owner = await projectRepository.findOwner(id);
    if (!owner || owner.deletedAt) throw new NotFoundError();
    if (owner.userId !== userId) throw new ForbiddenError();

    await projectRepository.softDelete(id);
    return id;
  }

  async restoreProject({ id, userId }: DeleteProjectParams) {
    const owner = await projectRepository.findOwner(id);
    if (!owner || !owner.deletedAt) throw new NotFoundError();
    if (owner.userId !== userId) throw new ForbiddenError();

    await projectRepository.restore(id);
    return id;
  }

  async permanentDeleteProject({ id, userId }: DeleteProjectParams) {
    const owner = await projectRepository.findOwner(id);
    if (!owner) throw new NotFoundError();
    if (owner.userId !== userId) throw new ForbiddenError();

    await projectLayerRepository.deleteByProjectId(id);
    await projectRepository.permanentDelete(id);
    return id;
  }
}

export const projectService = new ProjectService();
