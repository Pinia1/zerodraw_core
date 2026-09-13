import type { BananaService } from '../NanoBanana/banana.services';
import type { R2Service } from '../R2/r2.services';
import type { SeedreamService } from '../Seedream/seedream.services';
import type { UploadServices } from '../../plugins/infra.plugin';
import { GenerateQueue } from './generate.queue';
import { GenerateRepository } from './generate.repository';
import { GenerateService } from './generate.services';
import { GeneratorFactory } from './generators/factory';

export interface CreateGenerateModuleDeps {
  bananaService: BananaService;
  seedreamService: SeedreamService;
  r2Service: R2Service;
  uploadServices: UploadServices;
}

export function createGenerateModule(deps: CreateGenerateModuleDeps) {
  const generateRepository = new GenerateRepository();
  const generatorFactory = new GeneratorFactory(deps.bananaService, deps.seedreamService);
  const generateQueue = new GenerateQueue(generateRepository, generatorFactory, deps.uploadServices);
  const generateService = new GenerateService(
    generateRepository,
    generateQueue,
    deps.bananaService,
    deps.r2Service,
  );

  return { generateRepository, generatorFactory, generateQueue, generateService };
}
