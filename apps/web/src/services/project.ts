import type {
  CreateProjectInput,
  ProjectDetail,
  ProjectItem,
  ProjectListResponse,
  SaveLayersInput,
  UpdateProjectInput,
} from '@zeroDraw/api-contract';
import request from '.';

export const httpListProjects = (params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  deleted?: boolean;
}): Promise<ProjectListResponse> =>
  request.get('/api/project', { params });

export const httpCreateProject = (data: CreateProjectInput): Promise<ProjectItem> =>
  request.post('/api/project', data);

export const httpGetProject = (id: string): Promise<ProjectDetail> =>
  request.get(`/api/project/${id}`);

export const httpUpdateProject = (id: string, data: UpdateProjectInput): Promise<string> =>
  request.patch(`/api/project/${id}`, data);

export const httpSaveLayers = (id: string, data: SaveLayersInput): Promise<string> =>
  request.put(`/api/project/${id}/layers`, data);

export const httpDeleteProject = (id: string): Promise<string> =>
  request.delete(`/api/project/${id}`);

export const httpRestoreProject = (id: string): Promise<string> =>
  request.post(`/api/project/${id}/restore`);

export const httpPermanentDeleteProject = (id: string): Promise<string> =>
  request.delete(`/api/project/${id}/permanent`);
