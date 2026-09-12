import { useDrawingStore } from '../store/useDrawing';
import useLayerStore, { initialDrawingLayer } from '../store/useLayer';
import type { Fill, Layers } from '../types/Layers';
import { generateUUID } from './drawing';

function findNextLayerOrder(layers: Layers[]): number {
  if (!layers.length) return 1;
  const sorted = [...layers].sort((a, b) => a.order - b.order);
  return sorted[sorted.length - 1].order + 1;
}

export interface AddImageLayerFromSrcOptions {
  src: string;
  name?: string;
}

export interface AddImageLayerFromSrcResult {
  layerId: string;
  width: number;
  height: number;
}

/** 将图片作为新图层居中贴入当前画布（与 useCreateLayer.run 行为一致） */
export async function addImageLayerFromSrc(
  options: AddImageLayerFromSrcOptions,
): Promise<AddImageLayerFromSrcResult> {
  const { src, name } = options;
  const { layerConfig } = useDrawingStore.getState();
  const { layers, setDrawingLayer, pushHistory } = useLayerStore.getState();

  const img = await loadImage(src);
  const imgWidth = img.naturalWidth || img.width;
  const imgHeight = img.naturalHeight || img.height;
  if (!imgWidth || !imgHeight) {
    throw new Error('无法读取图片尺寸');
  }

  const canvasWidth = layerConfig.width;
  const canvasHeight = layerConfig.height;
  const imageRatio = imgWidth / imgHeight;
  const canvasRatio = canvasWidth / canvasHeight;

  const scale =
    imageRatio > canvasRatio ? canvasWidth / imgWidth : canvasHeight / imgHeight;
  const targetWidth = imgWidth * scale;
  const targetHeight = imgHeight * scale;
  const x = (canvasWidth - targetWidth) / 2;
  const y = (canvasHeight - targetHeight) / 2;

  const order = findNextLayerOrder(layers);
  const imageId = generateUUID();
  const image: Fill = {
    id: imageId,
    x,
    y,
    width: targetWidth,
    height: targetHeight,
    img,
    src,
    maxWidth: imgWidth,
    maxHeight: imgHeight,
    visible: true,
  };

  const newLayer: Layers = {
    ...initialDrawingLayer(),
    name: name ?? `Layer ${order + 1}`,
    order,
    diagrams: [{ id: image.id, type: 'image' }],
    image,
  };

  setDrawingLayer(newLayer);
  pushHistory([...layers, newLayer]);

  return { layerId: newLayer.id, width: imgWidth, height: imgHeight };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = src;
  });
}
