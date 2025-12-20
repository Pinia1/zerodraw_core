import { useKeyPress, useMemoizedFn } from '@zeroDraw/common';
import { RefObject } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useLayerStore from '../store/useLayer';
import useCopyLayer from './useCopyLayer';

interface UseDrawingKeyboardOptions {
  /** 是否正在绘制的 ref */
  isDrawing: RefObject<boolean>;
  /** 设置舞台可拖拽状态 */
  setStageDraggable: (draggable: boolean) => void;
  /** 完成线条绘制的回调 */
  finishLine: () => void;
}

/**
 * 封装绘图相关的键盘事件处理
 */
export const useDrawingKeyboard = ({
  isDrawing,
  setStageDraggable,
  finishLine,
}: UseDrawingKeyboardOptions) => {
  const { copy, paste } = useCopyLayer();
  const { undoHistory, redoHistory } = useLayerStore(
    useShallow((state) => ({
      undoHistory: state.undoHistory,
      redoHistory: state.redoHistory,
    }))
  );

  // Space 键：按下时启用拖拽，松开时禁用拖拽
  useKeyPress(
    'space',
    useMemoizedFn(() => {
      if (isDrawing.current) return;
      setStageDraggable(true);
    }),
    {
      events: ['keydown'],
    }
  );

  useKeyPress(
    'space',
    useMemoizedFn(() => {
      if (isDrawing.current) return;
      setStageDraggable(false);
    }),
    {
      events: ['keyup'],
    }
  );

  // Windows Chrome: 阻止 Alt 键默认行为
  useKeyPress(
    'alt',
    useMemoizedFn((e) => e.preventDefault())
  );

  // Esc 键：取消当前绘制
  useKeyPress(
    'esc',
    useMemoizedFn(() => {
      finishLine();
    }),
    {
      events: ['keydown'],
    }
  );

  useKeyPress(
    'ctrl.z',
    useMemoizedFn(() => {
      undoHistory();
    })
  );

  useKeyPress(
    'ctrl.y',
    useMemoizedFn(() => {
      redoHistory();
    })
  );

  //copy
  useKeyPress('ctrl.c', copy);
  //paste
  useKeyPress('ctrl.v', paste);
  //delete
};

export default useDrawingKeyboard;
