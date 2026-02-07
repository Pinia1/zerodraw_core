import { SeedreamGenerateParams } from '@zeroDraw/api-contract';
import { env } from '../../config/env';
import { InternalServerError } from '../../utils/errors';

class SeedreamService {
  private readonly BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
  private readonly API_KEY = env.SEEDREAM_API_KEY;
  private readonly MODEL_NAME = 'doubao-seedream-4-5-251128';

  async generate(params: SeedreamGenerateParams) {
    const response = await fetch(this.BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.API_KEY}`,
      },
      body: JSON.stringify({
        model: this.MODEL_NAME,
        ...params.args,
      }),
    });
    console.log('response', response);
    if (!response.ok) {
      throw new InternalServerError('Failed to generate image');
    }
    return response.json();
  }
}

export const seedreamService = new SeedreamService();
