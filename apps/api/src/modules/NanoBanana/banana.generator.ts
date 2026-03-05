import { NanobananaGenerateParams } from '@zeroDraw/api-contract';
import {
  AIGenerator,
  GenerateParams,
  GenerateResult,
} from '../AIGenerate/generators/base.generator';
import { bananaService } from './banana.services';

export class BananaGenerator extends AIGenerator {
  getSupportedAction(): string {
    return 'GRAAI_NANO_BANANA';
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const bananaParams = params as NanobananaGenerateParams;
    const result = await bananaService.generate(bananaParams);

    if (result.code !== 0) {
      throw new Error(`Banana generate failed (code: ${result.code}): ${result.msg}`);
    }

    const taskId = result.data.id;

    if (!taskId) {
      throw new Error('No taskId returned from Banana API');
    }

    console.log('Polling for taskId:', taskId);

    // 轮询获取结果
    const imageUrl = await this.pollResult(taskId);

    return {
      imageUrl,
      contentType: 'image/png',
      rawResponse: result,
    };
  }

  /** 轮询获取生成结果 */
  private async pollResult(taskId: string, maxAttempts = 120, interval = 5000): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await bananaService.getResult(taskId);

      if (result.code !== 0) {
        throw new Error(`Failed to get result (code: ${result.code}): ${result.msg}`);
      }

      if (result.data.status === 'succeeded') {
        return result.data.results?.[0]?.url || '';
      }

      if (result.data.status === 'failed') {
        throw new Error('Banana generation failed');
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error('Banana generation timeout');
  }
}
