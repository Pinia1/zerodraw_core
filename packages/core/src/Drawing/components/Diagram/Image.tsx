import { useMemoizedFn } from '@monorepo/common';
import Konva from 'konva';
import React from 'react';
import { Image as KonvaImage } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import useToolsStore from '../../../store/useTools';
import { Actions } from '../../../types/Drawing';
import { Fill as FillType } from '../../../types/Layers';

const Image = React.forwardRef<Konva.Image, FillType & Partial<Konva.ImageConfig>>(
  ({ x, y, width, height, img, onDragStart, onDragEnd }, ref) => {
    const { activeKey } = useToolsStore(
      useShallow((state) => ({
        activeKey: state.activeKey,
      }))
    );
    const handleDragEnd = useMemoizedFn((e: Konva.KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      e.target.preventDefault();
      onDragEnd(e);
    });

    return (
      <KonvaImage
        ref={ref}
        x={x}
        y={y}
        width={width}
        height={height}
        zz
        image={img}
        draggable={activeKey === Actions.ROPE}
        listening={activeKey === Actions.ROPE}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
      />
    );
  }
);

export default React.memo(Image);
