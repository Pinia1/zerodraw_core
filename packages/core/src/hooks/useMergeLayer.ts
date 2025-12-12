import { useMemoizedFn } from '@monorepo/common';
import { useShallow } from 'zustand/react/shallow';
import useLayerStore from '../store/useLayer';
import useToolsStore from '../store/useTools';
import { Actions } from '../types/Drawing';
import { Layers } from '../types/Layers';
import { generateUUID } from '../utils/drawing';

const useMergeLayer = (id?: string) => {
  const { layers, pushHistory, getDrawingLayer, setDrawingLayer } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
      pushHistory: state.pushHistory,
      getDrawingLayer: state.getDrawingLayer,
      setDrawingLayer: state.setDrawingLayer,
    }))
  );

  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );

  /**
   * 检查是否可以向下合并
   * 列表排序：b.order - a.order（order 大的在前，小的在后）
   * Merge down：合并到列表下方的图层（索引 +1，order 更小）
   */
  const canMergeDown = (): boolean => {
    if (!layers.length || layers.length < 2) return false;

    let sourceId: string | undefined = id;
    if (!sourceId) {
      sourceId = layers[layers.length - 1]?.id;
    }

    if (!sourceId) return false;

    // 使用和列表一致的排序：b.order - a.order
    const sortedLayers = [...layers].sort((a, b) => b.order - a.order);
    const sourceIndex = sortedLayers.findIndex((layer) => layer.id === sourceId);

    // 如果有下面的图层（索引 < length - 1），可以合并
    return sourceIndex < sortedLayers.length - 1;
  };

  /**
   * 检查是否可以向上合并
   * 列表排序：b.order - a.order（order 大的在前，小的在后）
   * Merge up：合并到列表上方的图层（索引 -1，order 更大）
   */
  const canMergeUp = (): boolean => {
    if (!layers.length || layers.length < 2) return false;

    let sourceId: string | undefined = id;
    if (!sourceId) {
      sourceId = layers[layers.length - 1]?.id;
    }

    if (!sourceId) return false;

    // 使用和列表一致的排序：b.order - a.order
    const sortedLayers = [...layers].sort((a, b) => b.order - a.order);
    const sourceIndex = sortedLayers.findIndex((layer) => layer.id === sourceId);

    // 如果有上面的图层（索引 > 0），可以合并
    return sourceIndex > 0;
  };

  /**
   * 合并两个图层的内容
   */
  const mergeLayers = (sourceLayer: Layers, targetLayer: Layers): Layers => {
    //todo
    if (activeKey === Actions.ROPE) {
      return sourceLayer;
    }
    return {
      ...targetLayer,
      // 合并所有内容数组
      lines: [...targetLayer.lines, ...sourceLayer.lines],
      eraserLines: [...targetLayer.eraserLines, ...sourceLayer.eraserLines],
      rects: [...targetLayer.rects, ...sourceLayer.rects],
      ellipses: [...targetLayer.ellipses, ...sourceLayer.ellipses],
      paths: [...targetLayer.paths, ...sourceLayer.paths],
      fills: [...targetLayer.fills, ...sourceLayer.fills],
      // 合并 diagrams
      diagrams: [...targetLayer.diagrams, ...sourceLayer.diagrams],
      // 如果源图层有 image 而目标图层没有，则使用源图层的 image
      image: targetLayer.image || sourceLayer.image,
    };
  };

  /**
   * 向下合并（合并到下面的图层）
   * 列表排序：b.order - a.order（order 大的在前，小的在后）
   * Merge down：当前图层合并到列表下方的图层（索引 +1，order 更小）
   */
  const mergeDown = (e?: any) => {
    e?.preventDefault?.();

    if (!layers.length || layers.length < 2) return;

    // 确定要合并的图层 id
    let sourceId: string | undefined = id;
    if (!sourceId) {
      // 如果没有指定 id，使用最后一个图层
      sourceId = layers[layers.length - 1]?.id;
    }

    if (!sourceId) return;

    // 找到源图层
    const sourceLayer = layers.find((layer) => layer.id === sourceId);
    if (!sourceLayer) return;

    // 使用和列表一致的排序：b.order - a.order
    const sortedLayers = [...layers].sort((a, b) => b.order - a.order);
    const sourceIndex = sortedLayers.findIndex((layer) => layer.id === sourceId);

    // 如果没有下面的图层（索引 >= length - 1），无法合并
    if (sourceIndex >= sortedLayers.length - 1) return;

    // 目标图层是列表下方的图层（索引 +1，order 更小）
    const targetLayer = sortedLayers[sourceIndex + 1];

    // 合并图层
    const mergedLayer = mergeLayers(sourceLayer, targetLayer);

    // 更新图层列表
    const newLayers = layers
      .filter((layer) => layer.id !== sourceId)
      .map((layer) => (layer.id === targetLayer.id ? mergedLayer : layer));

    // 如果被合并的是 drawingLayer，更新 drawingLayer
    const currentDrawingLayer = getDrawingLayer();
    if (currentDrawingLayer?.id === sourceId) {
      setDrawingLayer(mergedLayer, currentDrawingLayer.version || generateUUID());
    } else if (currentDrawingLayer?.id === targetLayer.id) {
      setDrawingLayer(mergedLayer, currentDrawingLayer.version || generateUUID());
    }

    // 记录历史
    pushHistory(newLayers);
  };

  /**
   * 向上合并（合并到上面的图层）
   * 列表排序：b.order - a.order（order 大的在前，小的在后）
   * Merge up：当前图层合并到列表上方的图层（索引 -1，order 更大）
   */
  const mergeUp = (e?: any) => {
    e?.preventDefault?.();

    if (!layers.length || layers.length < 2) return;

    // 确定要合并的图层 id
    let sourceId: string | undefined = id;
    if (!sourceId) {
      // 如果没有指定 id，使用最后一个图层
      sourceId = layers[layers.length - 1]?.id;
    }

    if (!sourceId) return;

    // 找到源图层
    const sourceLayer = layers.find((layer) => layer.id === sourceId);
    if (!sourceLayer) return;

    // 使用和列表一致的排序：b.order - a.order
    const sortedLayers = [...layers].sort((a, b) => b.order - a.order);
    const sourceIndex = sortedLayers.findIndex((layer) => layer.id === sourceId);

    // 如果没有上面的图层（索引 <= 0），无法合并
    if (sourceIndex <= 0) return;

    // 目标图层是列表上方的图层（索引 -1，order 更大）
    const targetLayer = sortedLayers[sourceIndex - 1];

    // 合并图层（注意：向上合并时，源图层合并到目标图层）
    const mergedLayer = mergeLayers(sourceLayer, targetLayer);

    // 更新图层列表
    const newLayers = layers
      .filter((layer) => layer.id !== sourceId)
      .map((layer) => (layer.id === targetLayer.id ? mergedLayer : layer));

    // 如果被合并的是 drawingLayer，更新 drawingLayer
    const currentDrawingLayer = getDrawingLayer();
    if (currentDrawingLayer?.id === sourceId) {
      setDrawingLayer(mergedLayer, currentDrawingLayer.version || generateUUID());
    } else if (currentDrawingLayer?.id === targetLayer.id) {
      setDrawingLayer(mergedLayer, currentDrawingLayer.version || generateUUID());
    }

    // 记录历史
    pushHistory(newLayers);
  };

  return {
    mergeDown: useMemoizedFn(mergeDown),
    mergeUp: useMemoizedFn(mergeUp),
    canMergeDown,
    canMergeUp,
  };
};

export default useMergeLayer;
