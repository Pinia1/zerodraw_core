import { AssetsRepository } from './assets.repository';
import { AssetsService } from './assets.services';

export function createAssetsModule() {
  const assetsRepository = new AssetsRepository();
  const assetsService = new AssetsService(assetsRepository);
  return { assetsRepository, assetsService };
}
