import type { LayerFilter } from '../types/Layers';

export const FILTER_PRESETS = [
  {
    key: 'none',
    label: 'None',
    value: {
      blur: 0,
      brightness: 100,
      contrast: 100,
      saturate: 100,
      hueRotate: 0,
      sepia: 0,
      grayscale: 0,
      invert: 0,
    } as Required<LayerFilter>,
  },
  {
    key: 'vivid',
    label: 'Vivid',
    value: {
      blur: 0,
      brightness: 110,
      contrast: 115,
      saturate: 125,
      hueRotate: 0,
      sepia: 0,
      grayscale: 0,
      invert: 0,
    } as Required<LayerFilter>,
  },
  {
    key: 'warm',
    label: 'Warm',
    value: {
      blur: 0,
      brightness: 105,
      contrast: 105,
      saturate: 110,
      hueRotate: -8,
      sepia: 12,
      grayscale: 0,
      invert: 0,
    } as Required<LayerFilter>,
  },
  {
    key: 'cool',
    label: 'Cool',
    value: {
      blur: 0,
      brightness: 102,
      contrast: 105,
      saturate: 108,
      hueRotate: 10,
      sepia: 0,
      grayscale: 0,
      invert: 0,
    } as Required<LayerFilter>,
  },
  {
    key: 'mono',
    label: 'B&W',
    value: {
      blur: 0,
      brightness: 105,
      contrast: 115,
      saturate: 0,
      hueRotate: 0,
      sepia: 0,
      grayscale: 100,
      invert: 0,
    } as Required<LayerFilter>,
  },
];
