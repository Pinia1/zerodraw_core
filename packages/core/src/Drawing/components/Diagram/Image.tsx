import { isEmptyObj, useMemoizedFn } from '@zeroDraw/common';
import Konva from 'konva';
import React, { useEffect, useMemo, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import useHit from '../../../hooks/useHit';
import { Fill as FillType } from '../../../types/Layers';
import imageManager from '../../../utils/imageManager';

const Image = React.forwardRef<Konva.Image, FillType & Partial<Konva.ImageConfig>>(
  (
    {
      x,
      y,
      width,
      height,
      id,
      img,
      onDragStart,
      onDragEnd,
      rotation,
      handleDragMove,
      draggable,
      opacity,
    },
    ref
  ) => {
    const [imageBitmap, setImageBitmap] = useState<ImageBitmap | null>(null);
    const { handleMouseEnter, shapeOpacity } = useHit({ opacity, id });

    useEffect(() => {
      if (isEmptyObj(img)) {
        getImageBitmap();
      }
    }, [img]);

    const getImageBitmap = useMemoizedFn(async () => {
      const stored = await imageManager.getImage(id);
      if (!stored || !stored.buffer) return;

      const blob = new Blob([stored.buffer], { type: stored.mimeType || 'image/webp' });
      const bitmap = await createImageBitmap(blob);
      setImageBitmap(bitmap);
    });

    const handleDragStart = useMemoizedFn((e: Konva.KonvaEventObject<DragEvent>) => {
      // iPad/触屏：双指期间不要进入 shape drag
      const touches = (e as any)?.evt?.touches as TouchList | undefined;
      if (touches && touches.length >= 2) {
        e.cancelBubble = true;
        (e as any)?.target?.stopDrag?.();
        return;
      }
      onDragStart?.(e as any);
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

    return (
      <KonvaImage
        ref={ref}
        x={x}
        y={y}
        width={width}
        height={height}
        rotation={rotation}
        image={image}
        draggable={draggable}
        listening={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragMove={handleDragMove}
        onPointerEnter={handleMouseEnter}
        opacity={shapeOpacity}
      />
    );
  }
);

export default Image;
