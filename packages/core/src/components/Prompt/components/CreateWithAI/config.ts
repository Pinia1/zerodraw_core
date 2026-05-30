import { NanobananaGenerateParams } from '@zeroDraw/api-contract';

export const sizeOptions = [
  {
    label: '512px',
    value: '512px',
  },
  {
    label: '1K',
    value: '1K',
  },
  {
    label: '2K',
    value: '2K',
  },
  {
    label: '4K',
    value: '4K',
  },
];

export const bananaSizes = ['1K', '2K'];
export const bananaProSzies = ['1K', '2K', '4K'];
export const gpt2ProSzies = ['1K', '2K', '4K'];
export const banana2Sizes = ['512px', '1K', '2K', '4K'];
export const sizeMap = {
  'nano-banana-pro': bananaProSzies,
  'nano-banana-2': banana2Sizes,
  'gpt-image-2': gpt2ProSzies,
};
export const getSizeOptions = (model: string) => {
  if (!model) return [];
  return sizeOptions.filter((size) => sizeMap[model as keyof typeof sizeMap].includes(size.value));
};

export const nanobananaAR = [
  'auto',
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '3:2',
  '2:3',
  '5:4',
  '4:5',
  '21:9',
];

export const gptAR = [
  'auto',
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '3:2',
  '2:3',
  '5:4',
  '4:5',
  '21:9',
  '3:1',
  '1:3',
  '2:1',
  '1:2',
];

export const gptArMap: Record<string, Record<string, string>> = {
  '1:1': { '1K': '1024x1024', '2K': '2048x2048', '4K': '2880x2880' },
  '16:9': { '1K': '1280x720', '2K': '2048x1152', '4K': '3840x2160' },
  '9:16': { '1K': '720x1280', '2K': '1152x2048', '4K': '2160x3840' },
  '4:3': { '1K': '1024x768', '2K': '2048x1536', '4K': '3312x2480' },
  '3:4': { '1K': '768x1024', '2K': '1536x2048', '4K': '2480x3312' },
  '3:2': { '1K': '1024x688', '2K': '2048x1360', '4K': '3520x2352' },
  '2:3': { '1K': '688x1024', '2K': '1360x2048', '4K': '2352x3520' },
  '5:4': { '1K': '1024x816', '2K': '2048x1632', '4K': '3216x2576' },
  '4:5': { '1K': '816x1024', '2K': '1632x2048', '4K': '2576x3216' },
  '21:9': { '1K': '2048x880', '2K': '2880x1232', '4K': '3840x1648' },
  '9:21': { '1K': '880x2048', '2K': '1232x2880', '4K': '1648x3840' },
  '3:1': { '1K': '2048x688', '2K': '2880x960', '4K': '3840x1280' },
  '1:3': { '1K': '688x2048', '2K': '960x2880', '4K': '1280x3840' },
  '2:1': { '1K': '2048x1024', '2K': '2880x1440', '4K': '3840x1920' },
  '1:2': { '1K': '1024x2048', '2K': '1440x2880', '4K': '1920x3840' },
};

export const getArOptions = (model: NanobananaGenerateParams['args']['model']) => {
  if (!model) return [];
  switch (model) {
    case 'nano-banana-2':
    case 'nano-banana-pro':
      return nanobananaAR;
    case 'gpt-image-2':
      return gptAR;
      return [];
  }
};

export const getImageAspectRatio = (
  model: NanobananaGenerateParams['args']['model'],
  imageSize: NanobananaGenerateParams['args']['imageSize'],
  aspectRatio: string
) => {
  console.log(imageSize, aspectRatio, '???');

  if (!model) return 'auto';
  if (aspectRatio === 'auto') return 'auto';
  switch (model) {
    case 'nano-banana-2':
    case 'nano-banana-pro':
      return aspectRatio;
    case 'gpt-image-2': {
      const sizeMap = gptArMap[aspectRatio];
      return sizeMap?.[imageSize] ?? sizeMap?.['2K'] ?? 'auto';
    }
  }
};
