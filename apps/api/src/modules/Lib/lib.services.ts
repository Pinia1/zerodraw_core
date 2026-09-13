import type { LibRepository } from './lib.repository';
import { DeleteOutputParams, GetOutputsParams, GetRunningParams } from './lib.type';

export class LibService {
  constructor(private readonly libRepository: LibRepository) {}

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
      this.libRepository.countOutputs({ userId, keyword, projectId, startDate, endDate }),
      this.libRepository.findOutputs({ userId, page, pageSize, keyword, projectId, startDate, endDate }),
    ]);
    return { list, total, page, pageSize };
  }

  async getRunning({ userId, action, projectId, startDate, endDate }: GetRunningParams) {
    return this.libRepository.findRunning({ userId, action, projectId, startDate, endDate });
  }

  async deleteOutput({ id, userId }: DeleteOutputParams) {
    return this.libRepository.softDelete(id, userId);
  }
}
