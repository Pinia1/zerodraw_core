import { useAsyncEffect } from '@monorepo/common';
import Konva from 'konva';
import React, { useRef, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import { Fill as FillType } from '../../../types/Layers';
import imageManager from '../../../utils/imageManager';

// 组件级别的内存缓存（ImageBitmap），避免重复 createImageBitmap 并保持旧图显示
const bitmapCache = new Map<string, ImageBitmap>();

const Fill: React.FC<FillType> = (props) => {
  const fillRef = useRef<Konva.Image>(null);
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
      ref={fillRef}
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
