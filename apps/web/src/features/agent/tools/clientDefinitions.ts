import type { ClientToolDefinition } from '@zeroDraw/api-contract';

/** Drawing 页可选注入的 client tools（与后端默认 frontend tools 等价） */
export const drawingClientToolDefinitions: ClientToolDefinition[] = [
  {
    name: 'get_canvas_state',
    label: '读取画布',
    description:
      '【必须调用】读取用户当前画布状态（图层列表、可见性、透明度等）。用户问画布/图层/在画什么时必须调用，不得编造。',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'switch_draw_tool',
    label: '切换画笔',
    description: '切换画笔工具组形态（pen / brush / fill）。',
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['pen', 'brush', 'fill'] },
      },
      required: ['mode'],
      additionalProperties: false,
    },
  },
  {
    name: 'place_svg',
    label: '放置 SVG',
    description: '将 SVG 解析为矢量 path 并放置为新图层。',
    parameters: {
      type: 'object',
      properties: {
        svg: { type: 'string', minLength: 1 },
        width: { type: 'number', exclusiveMinimum: 0 },
        height: { type: 'number', exclusiveMinimum: 0 },
        name: { type: 'string' },
      },
      required: ['svg'],
      additionalProperties: false,
    },
  },
];
