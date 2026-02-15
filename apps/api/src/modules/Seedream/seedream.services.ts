import { SeedreamGenerateParams, SeedreamGenerateResponse } from '@zeroDraw/api-contract';
import { env } from '../../config/env';
import { InternalServerError } from '../../utils/errors';
import { volcService } from '../Volc/volc.services';

class SeedreamService {
  private readonly BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
  private readonly API_KEY = env.SEEDREAM_API_KEY;
  private readonly MODEL_NAME = 'doubao-seedream-4-5-251128';

  async generate(params: SeedreamGenerateParams) {
    const {
      prompt,
      size,
      optimize_prompt_optionsnew,
      response_format,
      sequential_image_generation,
      stream,
      watermark,
    } = params.args;
    const { s3Key } = params;
    const image = s3Key?.map((key) => volcService.getSignedUrl(key));
    const response = await fetch(this.BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.API_KEY}`,
      },
      body: JSON.stringify({
        model: this.MODEL_NAME,
        prompt,
        size,
        image: image,
        optimize_prompt_optionsnew,
        response_format,
        sequential_image_generation,
        stream,
        watermark,
      }),
    });

    if (!response.ok) {
      throw new InternalServerError('Failed to generate image');
    }
    return response.json() as Promise<SeedreamGenerateResponse>;
  }
}

export const seedreamService = new SeedreamService();
