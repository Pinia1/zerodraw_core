import { useAsyncEffect } from '@zeroDraw/common';
import React, { useMemo, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import useGetHitFunc from '../../../hooks/useGetHitFunc';
import useHit from '../../../hooks/useHit';
import { Fill as FillType } from '../../../types/Layers';
import imageManager from '../../../utils/imageManager';

const bitmapCache = new Map<string, ImageBitmap>();

const Fill: React.FC<FillType> = (props) => {
  const [displayBitmap, setDisplayBitmap] = useState<ImageBitmap | null>(
    () => bitmapCache.get(props.id) ?? null
  );

  const { handleMouseEnter, shapeOpacity } = useHit({ opacity: 1, id: props.id });

  //计算 bitmap 内部非透明像素的紧致包围盒
  const { bounds } = useGetHitFunc(displayBitmap as ImageBitmap);

  useAsyncEffect(async () => {
    const cached = bitmapCache.get(props.id);
    if (cached) {
      setDisplayBitmap(cached);
      return;
    }

    const stored = await imageManager.getImage(props.id);
    if (!stored || !stored.buffer) return;

    const blob = new Blob([stored.buffer], { type: stored.mimeType || 'image/webp' });
    const bitmap = await createImageBitmap(blob);

    bitmapCache.set(props.id, bitmap);
    setDisplayBitmap(bitmap);
  }, [props.id]);

  const hitRect = useMemo(() => {
    if (!displayBitmap || !bounds) return null;

    const sx = props.width / Math.max(1, displayBitmap.width);
    const sy = props.height / Math.max(1, displayBitmap.height);

    return {
      x: bounds.left * sx,
      y: bounds.top * sy,
      width: bounds.width * sx,
      height: bounds.height * sy,
    };
  }, [displayBitmap, bounds, props.width, props.height]);

  return (
    <KonvaImage
      visible={props.visible}
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      image={displayBitmap || undefined}
      opacity={shapeOpacity}
      onPointerEnter={handleMouseEnter}
      hitFunc={(ctx, shape) => {
        if (!hitRect) {
          ctx.beginPath();
          ctx.rect(0, 0, props.width, props.height);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
          return;
        }

        ctx.beginPath();
        ctx.rect(hitRect.x, hitRect.y, hitRect.width, hitRect.height);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
    />
  );
};

export default React.memo(Fill);
