import { useMemoizedFn } from '@monorepo/common';
import { useShallow } from 'zustand/react/shallow';
import useLayerStore from '../store/useLayer';

const useOrderLayer = (id?: string) => {
  const { layers, pushHistory, getDrawingLayer, setDrawingLayer } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
      pushHistory: state.pushHistory,
      getDrawingLayer: state.getDrawingLayer,
      setDrawingLayer: state.setDrawingLayer,
    }))
  );

  /**
   * 获取所有图层中 order 的最大值和最小值
   */
  const getOrderRange = () => {
    if (!layers.length) return { min: 0, max: 0 };

    const orders = layers.map((layer) => layer.order);
    return {
      min: Math.min(...orders),
      max: Math.max(...orders),
    };
  };

  /**
   * 置顶（Send to front）
   * 将图层移动到列表顶部（order 最大，视觉上最上面）
   */
  const sendToFront = (e?: any) => {
    e?.preventDefault?.();

    if (!layers.length) return;

    let targetId: string | undefined = id;
    if (!targetId) {
      targetId = layers[layers.length - 1]?.id;
    }

    if (!targetId) return;

    const targetLayer = layers.find((layer) => layer.id === targetId);
    if (!targetLayer) return;

    const { max } = getOrderRange();

    // 如果已经在最顶部，不需要操作
    if (targetLayer.order === max) return;

    // 设置为最大值 + 1，确保在最顶部
    const newOrder = max + 1;

    // 更新图层列表
    const newLayers = layers.map((layer) =>
      layer.id === targetId ? { ...layer, order: newOrder } : layer
    );

    // 如果操作的是 drawingLayer，更新 drawingLayer
    const currentDrawingLayer = getDrawingLayer();
    if (currentDrawingLayer?.id === targetId) {
      setDrawingLayer({ ...currentDrawingLayer, order: newOrder }, currentDrawingLayer.version);
    }

    // 记录历史
    pushHistory(newLayers);
  };

  /**
   * 置底（Send to back）
   * 将图层移动到列表底部（order 最小，视觉上最下面）
   */
  const sendToBack = (e?: any) => {
    e?.preventDefault?.();

    if (!layers.length) return;

    let targetId: string | undefined = id;
    if (!targetId) {
      targetId = layers[layers.length - 1]?.id;
    }

    if (!targetId) return;

    const targetLayer = layers.find((layer) => layer.id === targetId);
    if (!targetLayer) return;

    const { min } = getOrderRange();

    // 如果已经在最底部，不需要操作
    if (targetLayer.order === min) return;

    // 设置为最小值 - 1，确保在最底部
    const newOrder = min - 1;

    // 更新图层列表
    const newLayers = layers.map((layer) =>
      layer.id === targetId ? { ...layer, order: newOrder } : layer
    );

    // 如果操作的是 drawingLayer，更新 drawingLayer
    const currentDrawingLayer = getDrawingLayer();
    if (currentDrawingLayer?.id === targetId) {
      setDrawingLayer({ ...currentDrawingLayer, order: newOrder }, currentDrawingLayer.version);
    }

    // 记录历史
    pushHistory(newLayers);
  };

  /**
   * 检查是否已经在最顶部
   */
  const isAtFront = (): boolean => {
    if (!layers.length) return false;

    let targetId: string | undefined = id;
    if (!targetId) {
      targetId = layers[layers.length - 1]?.id;
    }

    if (!targetId) return false;

    const targetLayer = layers.find((layer) => layer.id === targetId);
    if (!targetLayer) return false;

    const { max } = getOrderRange();
    return targetLayer.order === max;
  };

  /**
   * 检查是否已经在最底部
   */
  const isAtBack = (): boolean => {
    if (!layers.length) return false;

    let targetId: string | undefined = id;
    if (!targetId) {
      targetId = layers[layers.length - 1]?.id;
    }

    if (!targetId) return false;

    const targetLayer = layers.find((layer) => layer.id === targetId);
    if (!targetLayer) return false;

    const { min } = getOrderRange();
    return targetLayer.order === min;
  };

  return {
    sendToFront: useMemoizedFn(sendToFront),
    sendToBack: useMemoizedFn(sendToBack),
    isAtFront,
    isAtBack,
  };
};

export default useOrderLayer;
