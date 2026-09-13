import { NanobananaGenerateParams } from '@zeroDraw/api-contract';
import { getRequestParmas, getRequstUrl } from './banana.helpers';
import { env } from '../../config/env';
import { getGrsaiHost } from '../../config/grsai';
import type { VolcService } from '../Volc/volc.services';

export interface BananaGenerateResponse {
  code: number;
  msg: string;
  data: {
    id: string;
  };
}

export interface BananaResultResponse {
  code: number;
  msg: string;
  data: {
    id: string;
    status: 'running' | 'succeeded' | 'failed';
    imageUrl?: string;
    progress?: number;
    results?: {
      url: string;
      content: string;
    }[];
    error?: string;
  };
}

export class BananaService {
  private readonly API_KEY = env.NANOBANANA_API_KEY;
  private readonly BASE_URL = getGrsaiHost();

  constructor(private readonly volcService: VolcService) {}

  private resolveImageUrl(key: string): string {
    return key.startsWith('$') ? `${env.R2_PUBLIC_URL}/${key}` : this.volcService.getSignedUrl(key);
  }

  async generate(
    params: NanobananaGenerateParams,
    webhookUrl?: string,
  ): Promise<BananaGenerateResponse> {
    const { model } = params.args;
    const imageUrls = params.s3Key?.map((key) => this.resolveImageUrl(key));

    const requestUrl = getRequstUrl(model);
    const requestParams = getRequestParmas(model, params.args);

    const response = await fetch(`${this.BASE_URL}${requestUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.API_KEY}`,
      },
      body: JSON.stringify({
        ...requestParams,
        urls: imageUrls,
        webHook: webhookUrl ?? '-1',
        shutProgress: false,
      }),
    });
    return response.json() as Promise<BananaGenerateResponse>;
  }

  async getResult(taskId: string): Promise<BananaResultResponse> {
    const response = await fetch(`${this.BASE_URL}/v1/draw/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.API_KEY}`,
      },
      body: JSON.stringify({ id: taskId }),
    });

    return response.json() as Promise<BananaResultResponse>;
  }
}
