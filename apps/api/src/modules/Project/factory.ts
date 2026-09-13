import { ProjectRepository } from './project.repository';
import { ProjectService } from './project.services';

export function createProjectModule() {
  const projectRepository = new ProjectRepository();
  const projectService = new ProjectService(projectRepository);
  return { projectRepository, projectService };
}
