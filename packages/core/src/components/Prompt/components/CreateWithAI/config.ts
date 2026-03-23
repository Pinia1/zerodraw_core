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
export const banana2Sizes = ['512px', '1K', '2K', '4K'];
export const sizeMap = {
  //   'nano-banana': bananaSizes,
  'nano-banana-2': banana2Sizes,
  'nano-banana-pro': bananaProSzies,
};
export const getSizeOptions = (model: string) => {
  if (!model) return [];
  return sizeOptions.filter((size) => sizeMap[model as keyof typeof sizeMap].includes(size.value));
};
