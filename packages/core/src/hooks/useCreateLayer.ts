import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../store/useDrawing';
import useLayerStore, { initialDrawingLayer } from '../store/useLayer';
import { Fill, Layers } from '../types/Layers';

export function findMissingorder(layers: Layers[]): number {
  if (!layers.length) return 1;
  const arr = [...layers];
  arr.sort((a, b) => a.order - b.order);
  return arr[arr.length - 1].order + 1;
}

const useCreateLayer = () => {
  const [loading, setLoading] = useState(false);

  const { layerConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
    }))
  );

  const { layers, setDrawingLayer, pushHistory } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
      setDrawingLayer: state.setDrawingLayer,
      pushHistory: state.pushHistory,
    }))
  );
  const run = async (key: string, fetchUrl?: string, initLayer?: Partial<Layers>) => {
    return new Promise(async (resolve) => {
      setLoading(true);
      const order = findMissingorder(layers);
      const newLayer: Layers = {
        ...initialDrawingLayer(),
        ...initLayer,
        name: `Layer ${order + 1}`,
        order,
      };
      if (fetchUrl && key) {
        await new Promise(async (res) => {
          const img = new window.Image();
          img.crossOrigin = 'Anonymous';
          img.src = fetchUrl;
          img.onload = async () => {
            const imgWidth = img.naturalWidth || img.width;
            const imgHeight = img.naturalHeight || img.height;

            if (!imgWidth || !imgHeight) return;

            const canvasWidth = layerConfig.width;
            const canvasHeight = layerConfig.height;

            const imageRatio = imgWidth / imgHeight;
            const canvasRatio = canvasWidth / canvasHeight;

            let scale = 1;
            if (imageRatio > canvasRatio) {
              scale = canvasWidth / imgWidth;
            } else {
              scale = canvasHeight / imgHeight;
            }

            const targetWidth = imgWidth * scale;
            const targetHeight = imgHeight * scale;

            const x = (canvasWidth - targetWidth) / 2;
            const y = (canvasHeight - targetHeight) / 2;

            const image: Fill = {
              id: key,
              x,
              y,
              width: targetWidth,
              height: targetHeight,
              img,
              src: fetchUrl,
              maxWidth: imgWidth,
              maxHeight: imgHeight,
              visible: true,
            };
            newLayer.diagrams = [{ id: image.id, type: 'image' }];
            newLayer.image = image;
            res(null);
          };
          img.onerror = () => {
            res(null);
          };
        });
      }
      setDrawingLayer(newLayer);
      pushHistory([...layers, newLayer]);
      setLoading(false);
      resolve(null);
    });
  };

  return {
    loading,
    run,
  };
};

export default useCreateLayer;
