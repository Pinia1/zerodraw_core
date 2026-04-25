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

  /** 轮询获取生成结果，3分钟超时 */
  private async pollResult(
    taskId: string,
    timeout = 5 * 60 * 1000,
    interval = 5000
  ): Promise<string> {
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      let result: Awaited<ReturnType<typeof bananaService.getResult>>;
      try {
        result = await bananaService.getResult(taskId);
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
