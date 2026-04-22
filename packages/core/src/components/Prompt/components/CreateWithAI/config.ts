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
  //   'nano-banana': bananaSizes,
  'gpt-image-2': gpt2ProSzies,
  'nano-banana-2': banana2Sizes,
  'nano-banana-pro': bananaProSzies,
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
  ' 1:2',
];
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
