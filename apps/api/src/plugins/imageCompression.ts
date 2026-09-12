import sharp from 'sharp';

export type CompressedImageFormat = 'webp' | 'jpeg' | 'png';

export interface CompressImageOptions {
  maxDimension?: number;
  maxBytes?: number;
  quality?: number;
  format?: CompressedImageFormat;
}

export interface CompressedImage {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
  originalWidth: number;
  originalHeight: number;
  originalBytes: number;
  compressed: boolean;
}

export interface ImageDataUrl {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
  compressed: boolean;
}

const FORMAT_MIME: Record<CompressedImageFormat, string> = {
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

const VISION_SAFE_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif']);

const MAX_INPUT_BYTES = 25 * 1024 * 1024;

const DEFAULTS: Required<CompressImageOptions> = {
  maxDimension: 1568,
  maxBytes: 1_500_000,
  quality: 80,
  format: 'webp',
};

function encode(pipeline: ReturnType<typeof sharp>, format: CompressedImageFormat, quality: number): Promise<Buffer> {
  switch (format) {
    case 'webp':
      return pipeline.webp({ quality }).toBuffer();
    case 'jpeg':
      return pipeline.flatten({ background: '#ffffff' }).jpeg({ quality, mozjpeg: true }).toBuffer();
    case 'png':
      return pipeline.png({ quality, compressionLevel: 9 }).toBuffer();
  }
}

/**
 * 图片压缩服务：面向"喂给多模态模型看"的场景，不绑定任何具体存储/框架。
 *
 * 默认阈值对齐主流视觉模型的推荐输入（长边 1568px 左右精度即饱和，继续加大只加 token
 * 不加效果），压缩目标是控制 base64 payload 大小与 token 成本，不是画质优先。
 */
export class ImageCompressionService {
  async compress(input: Buffer, options: CompressImageOptions = {}): Promise<CompressedImage> {
    if (input.length > MAX_INPUT_BYTES) {
      throw new Error(`图片过大（${input.length} bytes），超过上限 ${MAX_INPUT_BYTES} bytes`);
    }

    const opts = { ...DEFAULTS, ...options };
    const pipeline = sharp(input, { animated: false, failOn: 'none' });
    const metadata = await pipeline.metadata();

    const originalWidth = metadata.width ?? 0;
    const originalHeight = metadata.height ?? 0;
    const originalBytes = input.length;
    const longEdge = Math.max(originalWidth, originalHeight);
    const isVisionSafeFormat = metadata.format !== undefined && VISION_SAFE_FORMATS.has(metadata.format);

    const needsResize = longEdge > opts.maxDimension;
    const needsShrink = originalBytes > opts.maxBytes;
    const needsReformat = !isVisionSafeFormat;

    if (!needsResize && !needsShrink && !needsReformat) {
      return {
        buffer: input,
        mimeType: `image/${metadata.format}`,
        width: originalWidth,
        height: originalHeight,
        bytes: originalBytes,
        originalWidth,
        originalHeight,
        originalBytes,
        compressed: false,
      };
    }

    const resized = needsResize
      ? pipeline.resize({ width: opts.maxDimension, height: opts.maxDimension, fit: 'inside', withoutEnlargement: true })
      : pipeline;

    const buffer = await encode(resized, opts.format, opts.quality);
    const finalMetadata = await sharp(buffer).metadata();

    return {
      buffer,
      mimeType: FORMAT_MIME[opts.format],
      width: finalMetadata.width ?? originalWidth,
      height: finalMetadata.height ?? originalHeight,
      bytes: buffer.length,
      originalWidth,
      originalHeight,
      originalBytes,
      compressed: true,
    };
  }

  async toDataUrl(input: Buffer, options?: CompressImageOptions): Promise<ImageDataUrl> {
    const result = await this.compress(input, options);
    return {
      dataUrl: `data:${result.mimeType};base64,${result.buffer.toString('base64')}`,
      mimeType: result.mimeType,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      compressed: result.compressed,
    };
  }
}

export const imageCompressionService = new ImageCompressionService();
