import { generateUUID, useMemoizedFn } from '@zeroDraw/common';
import { useShallow } from 'zustand/react/shallow';
import useLayerStore from '../store/useLayer';
import { Layers } from '../types/Layers';
import useCreateLayer from './useCreateLayer';

export const copyLayerRef = { current: null as Layers | null };

const useCopyLayer = (id?: string) => {
  const { layers } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
    }))
  );
  const { run: runCreateLayer } = useCreateLayer();
  const onCopy = () => {
    if (!layers.length) return;
    if (id) {
      const layer = layers.find((layer) => layer.id === id);
      if (layer) {
        copyLayerRef.current = layer;
      }
      return;
    }

    copyLayerRef.current = layers[layers.length - 1];
  };

  const onPaste = () => {
    if (!copyLayerRef.current) {
      return;
    }
    if (copyLayerRef.current.image) {
      const blob = new Blob([copyLayerRef.current.image.img?.src || ''], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      runCreateLayer(generateUUID(), url, {
        ...copyLayerRef.current,
        id: generateUUID(),
      });
      return;
    } else {
      runCreateLayer(generateUUID(), undefined, {
        ...copyLayerRef.current,
        id: generateUUID(),
      });
    }
  };

  return {
    copy: useMemoizedFn(onCopy),
    paste: useMemoizedFn(onPaste),
    layers,
  };
};

export default useCopyLayer;
