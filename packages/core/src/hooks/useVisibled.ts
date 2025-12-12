import { useMemoizedFn } from '@monorepo/common';
import { useShallow } from 'zustand/react/shallow';
import useLayerStore from '../store/useLayer';

const useVisibled = (id?: string) => {
  const { layers, pushHistory, getDrawingLayer, setDrawingLayer } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
      pushHistory: state.pushHistory,
      getDrawingLayer: state.getDrawingLayer,
      setDrawingLayer: state.setDrawingLayer,
    }))
  );

  /**
   * 切换其他所有图层的显示/隐藏状态
   * 如果其他图层都是可见的，则隐藏它们
   * 如果其他图层都是隐藏的，则显示它们
   * 如果混合状态，则统一隐藏（只显示当前图层）
   */
  const toggleOthersVisibility = (e?: any) => {
    e?.preventDefault?.();

    if (!layers.length || layers.length < 2) return;

    // 确定当前图层 id
    let currentId: string | undefined = id;
    if (!currentId) {
      currentId = layers[layers.length - 1]?.id;
    }

    if (!currentId) return;

    // 获取其他图层（排除当前图层）
    const otherLayers = layers.filter((layer) => layer.id !== currentId);

    if (otherLayers.length === 0) return;

    // 检查其他图层的可见性状态
    const allHidden = otherLayers.every((layer) => !layer.visible);

    // 确定新的可见性状态
    // 如果全部隐藏，则显示；否则统一隐藏（只显示当前图层）
    const newVisible = allHidden ? true : false;

    // 更新其他所有图层的可见性
    const newLayers = layers.map((layer) => {
      if (layer.id === currentId) {
        // 保持当前图层不变
        return layer;
      }
      return { ...layer, visible: newVisible };
    });

    // 如果 drawingLayer 是其他图层之一，也需要更新
    const currentDrawingLayer = getDrawingLayer();
    if (currentDrawingLayer && currentDrawingLayer.id !== currentId) {
      const updatedDrawingLayer = newLayers.find((layer) => layer.id === currentDrawingLayer.id);
      if (updatedDrawingLayer) {
        setDrawingLayer(updatedDrawingLayer, currentDrawingLayer.version);
      }
    }

    // 记录历史
    pushHistory(newLayers);
  };

  return {
    toggleOthersVisibility: useMemoizedFn(toggleOthersVisibility),
  };
};

export default useVisibled;
