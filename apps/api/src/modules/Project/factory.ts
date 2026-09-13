import { ProjectLayerRepository } from './projectLayer.repository';
import { ProjectRepository } from './project.repository';
import { ProjectService } from './project.services';

export function createProjectModule() {
  const projectRepository = new ProjectRepository();
  const projectLayerRepository = new ProjectLayerRepository();
  const projectService = new ProjectService(projectRepository, projectLayerRepository);
  return { projectRepository, projectLayerRepository, projectService };
}
