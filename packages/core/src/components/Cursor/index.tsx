import { useMouse } from '@monorepo/common';
import React from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import useToolsStore from '../../store/useTools';
import { Actions } from '../../types/Drawing';
import { CANVAS_CONTAINER_ID } from '../../utils/drawing';
import BucketCursor from './BucketCursor';
import EraserCursor from './EraserCursor';

interface CursorProps {
  visible: boolean;
}

const Cursor: React.FC<CursorProps> = ({ visible }) => {
  const mouse = useMouse(document.getElementById(CANVAS_CONTAINER_ID));
  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );
  const { eraserConfig } = useDrawingStore(
    useShallow((state) => ({
      eraserConfig: state.eraserConfig,
    }))
  );
  if (!visible) return null;
  if (activeKey === Actions.ERASER) {
    return createPortal(
      <EraserCursor r={eraserConfig.strokeWidth} x={mouse.elementX} y={mouse.elementY} />,
      document.body
    );
  }
  if (activeKey === Actions.FILL) {
    return createPortal(<BucketCursor x={mouse.elementX} y={mouse.elementY} />, document.body);
  }

  return null;
};
export default React.memo(Cursor);
