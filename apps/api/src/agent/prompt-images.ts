import type { ImageContent } from '@earendil-works/pi-ai';
import type { AgentPromptImage } from '@zeroDraw/api-contract';
import { imageCompressionService } from '../plugins/imageCompression';
import type { LocalStorageService } from '../modules/Local/local.storage';
import type { R2Service } from '../modules/R2/r2.services';
import type { VolcService } from '../modules/Volc/volc.services';
import { logger } from '../utils/logger';

export interface PromptImageServices {
  localStorage?: LocalStorageService;
  r2Service?: R2Service;
  volcService?: VolcService;
}

function createReadUploadedImage(services: PromptImageServices) {
  return async (key: string): Promise<{ buffer: Buffer; mimeType: string }> => {
    if (key.startsWith('$') && services.r2Service) {
      return services.r2Service.getFileBuffer(key);
    }
    if (services.volcService) {
      return services.volcService.getFileBuffer(key);
    }
    if (services.localStorage) {
      return services.localStorage.getFileBuffer(key);
    }
    throw new Error(`Cannot read uploaded image: ${key}`);
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

  return async (images: AgentPromptImage[] | undefined): Promise<ImageContent[] | undefined> => {
    if (!images || images.length === 0) return undefined;

    const contents: ImageContent[] = [];
    for (const image of images) {
      try {
        const resolved = await resolveImageBuffer(readUploadedImage, image);
        if (!resolved) continue;

        const compressed = await imageCompressionService.compress(resolved.buffer);
        contents.push({
          type: 'image',
          data: compressed.buffer.toString('base64'),
          mimeType: compressed.mimeType,
        });
      } catch (error) {
        logger.warn('Failed to load prompt image', { error, image });
      }
    }

    return contents.length > 0 ? contents : undefined;
  };
}
