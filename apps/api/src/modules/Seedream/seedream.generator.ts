import { SeedreamGenerateParams } from '@zeroDraw/api-contract';
import {
  AIGenerator,
  GenerateParams,
  GenerateResult,
} from '../AIGenerate/generators/base.generator';
import { seedreamService } from './seedream.services';

export class SeedreamGenerator extends AIGenerator {
  getSupportedAction(): string {
    return 'SEEDDREAM_IMAGE';
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    // 类型守卫：确保参数是 SeedreamGenerateParams
    if (params.action !== 'SEEDDREAM_IMAGE') {
      throw new Error(`Invalid action for SeedreamGenerator: ${params.action}`);
    }

    const seedreamParams = params as SeedreamGenerateParams;
    const result = await seedreamService.generate(seedreamParams);

    return {
      imageUrl: result.data[0].url,
      contentType: 'image/png',
      rawResponse: result,
    };
  }
}
