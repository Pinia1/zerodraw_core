import { NanobananaGenerateParams, SeedreamGenerateParams } from '@zeroDraw/api-contract';

/** 统一的生成参数类型 */
export type GenerateParams = SeedreamGenerateParams | NanobananaGenerateParams;

/** 统一的生成结果 */
export interface GenerateResult {
  /** 图片 URL */
  imageUrl: string;
  /** 内容类型 */
  contentType?: string;
  /** 原始响应数据 */
  rawResponse: any;
}

/** AI 生成器抽象接口 */
export abstract class AIGenerator {
  /** 生成图片 */
  abstract generate(params: GenerateParams): Promise<GenerateResult>;

  /** 获取支持的 action 类型 */
  abstract getSupportedAction(): string;
}
