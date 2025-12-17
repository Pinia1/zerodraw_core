import { useMemoizedFn } from '@zeroDraw/common';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../store/useDrawing';
import useLayerStore, { initialDrawingLayer } from '../store/useLayer';
import { Layers } from '../types/Layers';
import { exportStageWithBlendModes } from '../utils/BlendMode';
import { generateUUID } from '../utils/drawing';
import imageManager from '../utils/imageManager';

const useMergeLayer = (id?: string) => {
  const { layers, pushHistory, getDrawingLayer, setDrawingLayer } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
      pushHistory: state.pushHistory,
      getDrawingLayer: state.getDrawingLayer,
      setDrawingLayer: state.setDrawingLayer,
    }))
  );

  const { stageRef, layerConfig } = useDrawingStore(
    useShallow((state) => ({
      stageRef: state.stageRef,
      layerConfig: state.layerConfig,
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
  const mergeLayers = async (sourceLayer: Layers, targetLayer: Layers): Promise<Layers> => {
    const stage = stageRef?.current;

    const sourceHasBitmap =
      !!sourceLayer.image && (sourceLayer.diagrams ?? []).some((d) => d.type === 'image');
    const targetHasBitmap =
      !!targetLayer.image && (targetLayer.diagrams ?? []).some((d) => d.type === 'image');

    // 需求：如果两个图层都存在位图（image），则按图层顺序合成为一个位图，并且只保留这一个位图
    if (stage && sourceHasBitmap && targetHasBitmap && layerConfig?.width && layerConfig?.height) {
      const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

      const boundsOfImage = (img: NonNullable<Layers['image']>) => {
        const x = img.x ?? 0;
        const y = img.y ?? 0;
        const w = img.width ?? 0;
        const h = img.height ?? 0;
        const rot = img.rotation ?? 0;

        if (!rot) return { minX: x, minY: y, maxX: x + w, maxY: y + h };

        // Konva.Image 未设置 offset 时，rotation 默认绕 (x,y)（左上角）旋转
        const rad = (rot * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const pts = [
          { px: 0, py: 0 },
          { px: w, py: 0 },
          { px: w, py: h },
          { px: 0, py: h },
        ].map((p) => ({
          x: x + p.px * cos - p.py * sin,
          y: y + p.px * sin + p.py * cos,
        }));
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const p of pts) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
        return { minX, minY, maxX, maxY };
      };

      // 仅裁剪“两张位图叠加的区域”（两张位图在画布坐标中的并集包围盒），避免导出整画布
      const b1 = boundsOfImage(sourceLayer.image!);
      const b2 = boundsOfImage(targetLayer.image!);
      const unionMinX = clamp(Math.min(b1.minX, b2.minX), 0, layerConfig.width);
      const unionMinY = clamp(Math.min(b1.minY, b2.minY), 0, layerConfig.height);
      const unionMaxX = clamp(Math.max(b1.maxX, b2.maxX), 0, layerConfig.width);
      const unionMaxY = clamp(Math.max(b1.maxY, b2.maxY), 0, layerConfig.height);
      const cropW = Math.max(0, unionMaxX - unionMinX);
      const cropH = Math.max(0, unionMaxY - unionMinY);
      if (cropW <= 0 || cropH <= 0) return targetLayer;

      const bottomFirst = [sourceLayer, targetLayer].sort((a, b) => a.order - b.order);

      // 质量优先：用像素密度推导 pixelRatio（而不是固定 targetWidth），尽量避免二次缩放导致的模糊
      const density1 = Math.max(
        0,
        (sourceLayer.image?.maxWidth ?? 0) / Math.max(1, sourceLayer.image?.width ?? 1)
      );
      const density2 = Math.max(
        0,
        (targetLayer.image?.maxWidth ?? 0) / Math.max(1, targetLayer.image?.width ?? 1)
      );
      let pixelRatio = Math.max(1, Math.max(density1, density2) * 1.2);

      // 保护：限制导出尺寸（避免内存/性能问题）。由于我们已经裁剪到 cropW/cropH，直接用最大输出边限制即可。
      const maxOutDim = 3000;
      pixelRatio = Math.min(
        pixelRatio,
        maxOutDim / Math.max(1, cropW),
        maxOutDim / Math.max(1, cropH)
      );

      const dataUrl = await exportStageWithBlendModes(stage, bottomFirst, {
        pixelRatio,
        backgroundColor: 'transparent',
        cropX: layerConfig.x + unionMinX,
        cropY: layerConfig.y + unionMinY,
        cropWidth: cropW,
        cropHeight: cropH,
        mimeType: 'image/png',
        quality: 1,
      });

      if (!dataUrl) return targetLayer;

      const blob = await (await fetch(dataUrl)).blob();
      const imageId = generateUUID();
      blob.arrayBuffer().then((buffer) => {
        imageManager.saveImage(imageId, buffer, 'image/png');
      });

      const merged = await new Promise<Layers>((resolve) => {
        const img = new window.Image();
        const url = URL.createObjectURL(blob);
        img.src = url;
        img.onload = () => {
          URL.revokeObjectURL(url);
          const base = initialDrawingLayer();
          resolve({
            ...targetLayer,
            diagrams: [{ id: imageId, type: 'image' }],
            image: {
              id: imageId,
              x: unionMinX,
              y: unionMinY,
              width: cropW,
              height: cropH,
              img,
              src: img.src,
              visible: true,
              maxWidth: img.naturalWidth || img.width,
              maxHeight: img.naturalHeight || img.height,
            },
            blendMode: 'normal',
            opacity: 100,
            filter: base.filter,
          });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(targetLayer);
        };
      });

      return merged;
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
      lassos: [...targetLayer.lassos, ...sourceLayer.lassos],
      eraseLassos: [...targetLayer.eraseLassos, ...sourceLayer.eraseLassos],
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
  const mergeDown = async (e?: any) => {
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
    const mergedLayer = await mergeLayers(sourceLayer, targetLayer);

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
  const mergeUp = async (e?: any) => {
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
    const mergedLayer = await mergeLayers(sourceLayer, targetLayer);

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
