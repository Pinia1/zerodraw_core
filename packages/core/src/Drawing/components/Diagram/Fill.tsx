import { useAsyncEffect } from '@monorepo/common';
import React, { useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import { Fill as FillType } from '../../../types/Layers';
import imageManager from '../../../utils/imageManager';

const Fill: React.FC<FillType> = (props) => {
  const [imageBitmap, setImageBitmap] = useState<ImageBitmap | null>(null);

  useAsyncEffect(async () => {
    const stored = await imageManager.getImage(props.id);
    if (!stored || !stored.buffer) return;

    const blob = new Blob([stored.buffer], { type: stored.mimeType || 'image/webp' });
    const bitmap = await createImageBitmap(blob);

    setImageBitmap(bitmap);
  }, [props.id]);

  return (
    <KonvaImage
      visible={props.visible}
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      image={imageBitmap || undefined}
    />
  );
};

export default React.memo(Fill);
