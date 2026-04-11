import { libRepository } from './lib.repository';
import { DeleteOutputParams, GetOutputsParams, GetRunningParams } from './lib.type';

class LibService {
  async getOutputs({
    userId,
    page,
    pageSize,
    keyword,
    projectId,
    startDate,
    endDate,
  }: GetOutputsParams) {
    const [total, list] = await Promise.all([
      libRepository.countOutputs({ userId, keyword, projectId, startDate, endDate }),
      libRepository.findOutputs({ userId, page, pageSize, keyword, projectId, startDate, endDate }),
    ]);
    return { list, total, page, pageSize };
  }

  async getRunning({ userId, action, projectId, startDate, endDate }: GetRunningParams) {
    return libRepository.findRunning({ userId, action, projectId, startDate, endDate });
  }

  async deleteOutput({ id, userId }: DeleteOutputParams) {
    return libRepository.softDelete(id, userId);
  }
}

export const libService = new LibService();
