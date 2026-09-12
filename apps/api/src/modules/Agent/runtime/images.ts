import type { ImageContent } from '@earendil-works/pi-ai';
import type { AgentPromptImage } from '@zeroDraw/api-contract';
import { imageCompressionService } from '../../../plugins/imageCompression';
import { logger } from '../../../utils/logger';
import { r2Service } from '../../R2';
import { volcService } from '../../Volc/volc.services';

async function readUploadedImage(key: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (key.startsWith('$')) {
    return r2Service.getFileBuffer(key);
  }
  return volcService.getFileBuffer(key);
}

async function resolveImageBuffer(
  image: AgentPromptImage,
): Promise<{ buffer: Buffer; mimeType: string } | undefined> {
  if (image.s3Key) {
    return readUploadedImage(image.s3Key);
  }
  if (image.data) {
    return {
      buffer: Buffer.from(image.data, 'base64'),
      mimeType: image.mimeType ?? 'image/png',
    };
  }
  return undefined;
}

export async function buildPromptImageContents(
  images: AgentPromptImage[] | undefined,
): Promise<ImageContent[] | undefined> {
  if (!images || images.length === 0) return undefined;

  const contents = await Promise.all(
    images.map(async (image): Promise<ImageContent | undefined> => {
      try {
        const resolved = await resolveImageBuffer(image);
        if (!resolved) return undefined;
        try {
          const compressed = await imageCompressionService.compress(resolved.buffer);
          return {
            type: 'image',
            data: compressed.buffer.toString('base64'),
            mimeType: compressed.mimeType,
          };
        } catch (error) {
          logger.error('[Agent] image compression failed, falling back to original', undefined, {
            mimeType: resolved.mimeType,
            s3Key: image.s3Key,
            error: error instanceof Error ? error.message : String(error),
          });
          return {
            type: 'image',
            data: resolved.buffer.toString('base64'),
            mimeType: resolved.mimeType,
          };
        }
      } catch (error) {
        logger.error('[Agent] image resolve failed, skipping', undefined, {
          s3Key: image.s3Key,
          error: error instanceof Error ? error.message : String(error),
        });
        return undefined;
      }
    }),
  );

  const next = contents.filter((item): item is ImageContent => item !== undefined);
  return next.length > 0 ? next : undefined;
}
