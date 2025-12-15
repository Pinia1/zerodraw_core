import { useMemoizedFn } from '@monorepo/common';
import { useShallow } from 'zustand/react/shallow';
import useLayerStore, { initialDrawingLayer } from '../store/useLayer';
import { generateUUID } from '../utils/drawing';

const useDeletedLayer = (id?: string) => {
  const { layers, pushHistory, getDrawingLayer, setDrawingLayer } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
      pushHistory: state.pushHistory,
      getDrawingLayer: state.getDrawingLayer,
      setDrawingLayer: state.setDrawingLayer,
    }))
  );

  const onDelete = () => {
    if (!layers.length) return;

    // 确定要删除的 layer id
    let targetId: string | undefined = id;
    if (!targetId) {
      // 如果没有指定 id，删除最后一个 layer
      targetId = layers[layers.length - 1]?.id;
    }

    if (!targetId) return;

    // 找到要删除的 layer
    const targetLayer = layers.find((layer) => layer.id === targetId);
    if (!targetLayer) return;

    // 如果只有一个 layer，不能删除，需要至少保留一个
    if (layers.length === 1) {
      // 可以选择清空当前 layer 而不是删除
      const newLayer = initialDrawingLayer();
      setDrawingLayer(newLayer);
      pushHistory([newLayer]);
      return;
    }

    // 从 layers 数组中移除
    const newLayers = layers.filter((layer) => layer.id !== targetId);

    // 如果删除的是当前 drawingLayer，需要更新 drawingLayer
    const currentDrawingLayer = getDrawingLayer();
    if (currentDrawingLayer?.id === targetId) {
      // 设置为新的最后一个 layer
      const newDrawingLayer = newLayers[newLayers.length - 1];
      if (newDrawingLayer) {
        setDrawingLayer(newDrawingLayer, currentDrawingLayer.version || generateUUID());
      }
    }

    pushHistory(newLayers);
  };

  return {
    delete: useMemoizedFn(onDelete),
  };
};

export default useDeletedLayer;
