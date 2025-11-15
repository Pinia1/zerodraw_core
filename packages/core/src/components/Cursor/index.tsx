import { useMouse } from '@monorepo/common';
import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import useToolsStore from '../../store/useTools';
import { Actions } from '../../types/Drawing';
import { CANVAS_CONTAINER_ID } from '../../utils/drawing';
import BucketCursor from './BucketCursor';
import EraserCursor from './EraserCursor';

const Cursor = () => {
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
  if (activeKey === Actions.ERASER) {
    return <EraserCursor r={eraserConfig.strokeWidth} x={mouse.elementX} y={mouse.elementY} />;
  }
  if (activeKey === Actions.FILL) {
    return <BucketCursor x={mouse.elementX} y={mouse.elementY} />;
  }

  return null;
};
export default React.memo(Cursor);
