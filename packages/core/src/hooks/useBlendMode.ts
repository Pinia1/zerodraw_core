import { useMemoizedFn } from '@monorepo/common';
import { useShallow } from 'zustand/react/shallow';
import useLayerStore from '../store/useLayer';
import type { BlendMode } from '../types/Layers';

const useBlendMode = (id?: string) => {
  const { layers, pushHistory, getDrawingLayer, setDrawingLayer } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
      pushHistory: state.pushHistory,
      getDrawingLayer: state.getDrawingLayer,
      setDrawingLayer: state.setDrawingLayer,
    }))
  );

  const setBlendMode = (blendMode: BlendMode) => {
    let targetId: string | undefined = id;
    if (!targetId) {
      targetId = layers[layers.length - 1]?.id;
    }

    if (!targetId) return;

    // 更新图层列表
    const newLayers = layers.map((layer) =>
      layer.id === targetId ? { ...layer, blendMode } : layer
    );

    // 如果操作的是 drawingLayer，更新 drawingLayer
    const currentDrawingLayer = getDrawingLayer();
    if (currentDrawingLayer?.id === targetId) {
      setDrawingLayer({ ...currentDrawingLayer, blendMode }, currentDrawingLayer.version);
    }

    // 记录历史
    pushHistory(newLayers);
  };

  return {
    setBlendMode: useMemoizedFn(setBlendMode),
  };
};

export default useBlendMode;
