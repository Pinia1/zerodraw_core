import { useDrawingStore } from './useDrawing';
import useToolsStore from './useTools';
import { Actions } from '../types/Drawing';
import { createFillWorker } from '../utils/fillWorker';

/** 画笔工具组形态：钢笔 / 毛刷 / 填充（对应底部子工具栏） */
export type DrawToolMode = 'pen' | 'brush' | 'fill';

export const DRAW_TOOL_MODES = ['pen', 'brush', 'fill'] as const;

const MODE_TO_ACTION: Record<DrawToolMode, Actions> = {
  pen: Actions.PEN,
  brush: Actions.BRUSH,
  fill: Actions.FILL,
};

const ACTION_TO_MODE: Partial<Record<Actions, DrawToolMode>> = {
  [Actions.PEN]: 'pen',
  [Actions.BRUSH]: 'brush',
  [Actions.FILL]: 'fill',
};

export function getDrawToolMode(): DrawToolMode | null {
  return ACTION_TO_MODE[useToolsStore.getState().activeKey] ?? null;
}

export function setDrawToolMode(mode: DrawToolMode): {
  previousMode: DrawToolMode | null;
  currentMode: DrawToolMode;
} {
  const previousMode = getDrawToolMode();
  useToolsStore.getState().setActiveKey(MODE_TO_ACTION[mode]);
  if (mode === 'fill') {
    useDrawingStore.getState().bindWorkerRef(createFillWorker());
  }
  return { previousMode, currentMode: mode };
}
