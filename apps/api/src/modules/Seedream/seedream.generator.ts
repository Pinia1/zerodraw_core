import { SeedreamGenerateParams } from '@zeroDraw/api-contract';
import {
  AIGenerator,
  GenerateParams,
  GenerateResult,
} from '../AIGenerate/generators/base.generator';
import type { SeedreamService } from './seedream.services';

export class SeedreamGenerator extends AIGenerator {
  constructor(private readonly seedreamService: SeedreamService) {
    super();
  }

  getSupportedAction(): string {
    return 'SEEDDREAM_IMAGE';
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    if (params.action !== 'SEEDDREAM_IMAGE') {
      throw new Error(`Invalid action for SeedreamGenerator: ${params.action}`);
    }

    const seedreamParams = params as SeedreamGenerateParams;
    const result = await this.seedreamService.generate(seedreamParams);

    return {
      imageUrl: result.data[0].url,
      contentType: 'image/png',
      rawResponse: result,
    };
  }
}
