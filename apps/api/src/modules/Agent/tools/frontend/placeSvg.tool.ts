import { Type } from '@earendil-works/pi-ai';
import { createFrontendTool } from './createFrontendTool';

const PlaceSvgParameters = Type.Object({
  svg: Type.String({ description: '完整 SVG 标记，需含 xmlns，路径/形状自包含，勿引用外部资源' }),
  width: Type.Optional(Type.Number({ description: '输出宽度（像素），省略则从 viewBox/width 推断' })),
  height: Type.Optional(Type.Number({ description: '输出高度（像素），省略则从 viewBox/height 推断' })),
  name: Type.Optional(Type.String({ description: '新图层名称' })),
});

export function createPlaceSvgTool() {
  return createFrontendTool({
    name: 'place_svg',
    description:
      '【画布绘制】将 SVG 解析为矢量 path（Path2D 渲染，非位图）并作为新图层贴入当前画布（居中适配）。用户要求在画布上绘制简单图形、图标、线条插画时使用；输出合法 SVG（path/circle/rect/ellipse/line/polyline/polygon，自包含颜色，勿用 text/外部资源/transform），禁止声称已绘制而未调用本工具。',
    label: '贴入 SVG',
    parameters: PlaceSvgParameters,
  });
}
