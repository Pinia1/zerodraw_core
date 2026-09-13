import type {
  CreateProjectInput,
  ListProjectQuery,
  SaveProjectFlowInput,
  UpdateProjectInput,
} from '@zeroDraw/api-contract';

export interface CreateProjectParams extends CreateProjectInput {
  userId: number;
}

export interface ListProjectParams extends ListProjectQuery {
  userId: number;
}

export interface GetProjectParams {
  id: string;
  userId: number;
}

export interface UpdateProjectParams extends UpdateProjectInput {
  id: string;
  userId: number;
}

export interface DeleteProjectParams {
  id: string;
  userId: number;
}

export interface SaveProjectFlowParams extends SaveProjectFlowInput {
  id: string;
  userId: number;
}
