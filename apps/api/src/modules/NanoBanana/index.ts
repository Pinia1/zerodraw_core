import { NanobananaGenerateParams } from '@zeroDraw/api-contract';

type ModelType = NanobananaGenerateParams['args']['model'];

export const getRequstUrl = (model: ModelType) => {
  switch (model) {
    case 'nano-banana-2':
    case 'nano-banana-pro':
      return '/v1/draw/nano-banana';
    case 'gpt-image-2':
      return '/v1/draw/completions';
  }
};

export const getRequestParmas = (model: ModelType, args: NanobananaGenerateParams['args']) => {
  switch (model) {
    case 'nano-banana-2':
    case 'nano-banana-pro':
      return {
        model: model,
        prompt: args.prompt,
        aspectRatio: args.aspectRatio,
        imageSize: args.imageSize,
      };
    case 'gpt-image-2':
      return {
        model: model,
        prompt: args.prompt,
        size: args.aspectRatio,
      };
  }
};
