import type { SwitchDrawToolArgs } from '@zeroDraw/api-contract';
import type { FrontendToolDefinition } from '@zeroDraw/core';
import { setDrawToolMode } from '@zeroDraw/core';

export const switchDrawTool: FrontendToolDefinition<SwitchDrawToolArgs> = {
  name: 'switch_draw_tool',
  execute(args) {
    return setDrawToolMode(args.mode);
  },
};
