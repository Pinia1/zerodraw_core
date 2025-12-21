import { cropTransparentBorder } from '@zeroDraw/common';
import { useEffect, useState } from 'react';

const useGetHitFunc = (bitmap: ImageBitmap) => {
  const [bounds, setBounds] = useState<{
    width: number;
    height: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
  } | null>(null);
  useEffect(() => {
    if (!bitmap) return;
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(bitmap, 0, 0);
    const imageData = ctx?.getImageData(0, 0, bitmap.width, bitmap.height);
    const { bounds } = cropTransparentBorder(imageData!);
    setBounds(bounds);
  }, [bitmap]);

  return {
    bounds,
  };
};

export default useGetHitFunc;
