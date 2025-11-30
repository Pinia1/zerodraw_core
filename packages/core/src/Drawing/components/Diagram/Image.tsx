import { isEmptyObj, useMemoizedFn } from '@monorepo/common';
import Konva from 'konva';
import React, { useEffect, useMemo, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import useToolsStore from '../../../store/useTools';
import { Actions } from '../../../types/Drawing';
import { Fill as FillType } from '../../../types/Layers';
import imageManager from '../../../utils/imageManager';

const Image = React.forwardRef<Konva.Image, FillType & Partial<Konva.ImageConfig>>(
  ({ x, y, width, height, id, img, onDragStart, onDragEnd, handleBindTransformer, src }, ref) => {
    const [imageBitmap, setImageBitmap] = useState<ImageBitmap | null>(null);

    useEffect(() => {
      if (isEmptyObj(img)) {
        getImageBitmap();
      }
    }, [img]);

    const { activeKey } = useToolsStore(
      useShallow((state) => ({
        activeKey: state.activeKey,
      }))
    );

    const getImageBitmap = useMemoizedFn(async () => {
      const stored = await imageManager.getImage(id);
      if (!stored || !stored.buffer) return;

      const blob = new Blob([stored.buffer], { type: stored.mimeType || 'image/webp' });
      const bitmap = await createImageBitmap(blob);
      setImageBitmap(bitmap);
    });

    const handleDragEnd = useMemoizedFn((e: Konva.KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      e.target.preventDefault();
      onDragEnd(e);
    });

    const image = useMemo(() => {
      if (img instanceof HTMLImageElement) {
        return img;
      }
      if (isEmptyObj(img) && imageBitmap) {
        return imageBitmap;
      }
      return undefined;
    }, [imageBitmap, img]);

    useEffect(() => {
      handleBindTransformer();
    }, [image]);

    return (
      <KonvaImage
        ref={ref}
        x={x}
        y={y}
        width={width}
        height={height}
        image={image}
        draggable={activeKey === Actions.ROPE}
        listening={activeKey === Actions.ROPE}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
      />
    );
  }
);

export default Image;
