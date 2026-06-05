import BRUSH_PRESETS from './brush-presets.ts';

export const BUILTIN_BRUSHES = Object.fromEntries(
  BRUSH_PRESETS.map(({ name, data }) => [name, data])
);

export default BUILTIN_BRUSHES;
