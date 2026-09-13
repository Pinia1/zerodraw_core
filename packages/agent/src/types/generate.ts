import type { NanobananaGenerateParams, SeedreamGenerateParams } from '@zeroDraw/api-contract';

/** 图像生成工具 submit 参数（与 AIGenerate 模块对齐） */
export type GenerateParams = SeedreamGenerateParams | NanobananaGenerateParams;
