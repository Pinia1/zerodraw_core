import type { ImageContent } from '@earendil-works/pi-ai';
import type { AgentPromptImage } from '@zeroDraw/api-contract';
import { imageCompressionService } from '../plugins/imageCompression';
import type { R2Service } from '../modules/R2/r2.services';
import type { VolcService } from '../modules/Volc/volc.services';
import { logger } from '../utils/logger';

export interface PromptImageServices {
  r2Service: R2Service;
  volcService: VolcService;
}

function createReadUploadedImage(services: PromptImageServices) {
  return async (key: string): Promise<{ buffer: Buffer; mimeType: string }> => {
    if (key.startsWith('$')) {
      return services.r2Service.getFileBuffer(key);
    }
    return services.volcService.getFileBuffer(key);
  };
}

async function resolveImageBuffer(
  readUploadedImage: (key: string) => Promise<{ buffer: Buffer; mimeType: string }>,
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

export function createBuildPromptImageContents(services: PromptImageServices) {
  const readUploadedImage = createReadUploadedImage(services);

  return async function buildPromptImageContents(
    images: AgentPromptImage[] | undefined,
  ): Promise<ImageContent[] | undefined> {
    if (!images || images.length === 0) return undefined;

    const contents = await Promise.all(
      images.map(async (image): Promise<ImageContent | undefined> => {
        try {
          const resolved = await resolveImageBuffer(readUploadedImage, image);
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
  };
}
