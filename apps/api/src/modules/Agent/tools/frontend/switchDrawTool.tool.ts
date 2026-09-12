import { Type } from '@earendil-works/pi-ai';
import { createFrontendTool } from './createFrontendTool';

const SwitchDrawToolParameters = Type.Object({
  mode: Type.Union([
    Type.Literal('pen'),
    Type.Literal('brush'),
    Type.Literal('fill'),
  ]),
});

export function createSwitchDrawToolTool() {
  return createFrontendTool({
    name: 'switch_draw_tool',
    description:
      '【必须调用】切换用户画布上的画笔工具形态。mode=pen 钢笔，mode=brush 毛刷，mode=fill 填充/油漆桶。用户说「换成填充/毛刷/钢笔/油漆桶」时必须调用本工具，不得仅用文字回复已切换。',
    label: '切换画笔形态',
    parameters: SwitchDrawToolParameters,
  });
}
