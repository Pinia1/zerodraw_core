import { useAsyncEffect } from '@zeroDraw/common';
import React, { useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import { Fill as FillType } from '../../../types/Layers';
import imageManager from '../../../utils/imageManager';

/**
 * When switching to the drawing mode,
 *  always ensure that the "fill" option remains available on the interface.
 * @todo implement this
 * Remove the cache at a certain point in time
 *
 */
const bitmapCache = new Map<string, ImageBitmap>();

const Fill: React.FC<FillType> = (props) => {
  const [displayBitmap, setDisplayBitmap] = useState<ImageBitmap | null>(
    () => bitmapCache.get(props.id) ?? null
  );

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

  return (
    <KonvaImage
      visible={props.visible}
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      image={displayBitmap || undefined}
    />
  );
};

export default React.memo(Fill, () => true);
