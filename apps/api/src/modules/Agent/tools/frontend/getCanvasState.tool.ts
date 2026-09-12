import { Type } from '@earendil-works/pi-ai';
import { createFrontendTool } from './createFrontendTool';

const GetCanvasStateParameters = Type.Object({});

export function createGetCanvasStateTool() {
  return createFrontendTool({
    name: 'get_canvas_state',
    description:
      '【必须调用】读取用户当前画布状态（图层列表、可见性、透明度等）。用户问画布/图层/在画什么时必须调用，不得编造。',
    label: '读取画布',
    parameters: GetCanvasStateParameters,
  });
}
