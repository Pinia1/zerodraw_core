import { NanobananaGenerateParams } from '@zeroDraw/api-contract';
import {
  AIGenerator,
  GenerateParams,
  GenerateResult,
} from '../AIGenerate/generators/base.generator';
import type { BananaService } from './banana.services';

export class BananaGenerator extends AIGenerator {
  constructor(private readonly bananaService: BananaService) {
    super();
  }

  getSupportedAction(): string {
    return 'GRAAI_NANO_BANANA';
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const bananaParams = params as NanobananaGenerateParams;
    const result = await this.bananaService.generate(bananaParams);

    if (result.code !== 0) {
      throw new Error(`Banana generate failed (code: ${result.code}): ${result.msg}`);
    }

    const taskId = result.data.id;

    if (!taskId) {
      throw new Error('No taskId returned from Banana API');
    }

    const imageUrl = await this.pollResult(taskId);

    return {
      imageUrl,
      contentType: 'image/png',
      rawResponse: result,
    };
  }

  private async pollResult(
    taskId: string,
    timeout = 5 * 60 * 1000,
    interval = 5000,
  ): Promise<string> {
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      let result: Awaited<ReturnType<BananaService['getResult']>>;
      try {
        result = await this.bananaService.getResult(taskId);
      } catch {
        await new Promise((resolve) => setTimeout(resolve, interval));
        continue;
      }

      if (result.code === 0) {
        if (result.data.status === 'succeeded') {
          return result.data.results?.[0]?.url || '';
        }
        if (result.data.status === 'failed') {
          throw new Error(result.data.error || 'Banana generation failed');
        }
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error('Banana generation timeout');
  }
}
