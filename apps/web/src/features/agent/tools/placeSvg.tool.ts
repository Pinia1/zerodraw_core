import type { PlaceSvgArgs, PlaceSvgResult } from '@zeroDraw/api-contract';
import { addSvgPathsToLayer, type FrontendToolDefinition } from '@zeroDraw/core';

export const placeSvgTool: FrontendToolDefinition<PlaceSvgArgs, PlaceSvgResult> = {
  name: 'place_svg',
  kind: 'frontend',
  capabilities: ['canvas.mutate'],
  execute(args) {
    return addSvgPathsToLayer({
      svg: args.svg,
      width: args.width,
      height: args.height,
      name: args.name,
    });
  },
};
