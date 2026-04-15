import { useDebounceEffect, useDebounceFn, useMemoizedFn } from '@zeroDraw/common';
import Konva from 'konva';
import { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { MOSIC_LAYER_ID } from '../Drawing/components/Mosic';
import { THUMBNAIL_LAYER_ID } from '../Drawing/components/Thumbnail';
import { saveStageCover } from '../local/indexDb';
import { useDrawingStore } from '../store/useDrawing';
import useLayerStore from '../store/useLayer';
import useThumbnailStore from '../store/useThumbnail';
import { blendModeToCompositeOperation, layerFilterToCssFilter } from '../utils/BlendMode';
import { WIDTH } from '../utils/drawing';
import { isMobile } from '../utils/platform';

const LAYER_PREVIEW_WIDTH = 620;
const LAYER_PREVIEW_HEIGHT = 350;
const SKIP_LAYER_IDS = new Set([THUMBNAIL_LAYER_ID, MOSIC_LAYER_ID]);

type StageRef = React.RefObject<Konva.Stage> | null | undefined;

export type UseWheelLayerCacheOptions = {
  endWait?: number;
  topLayerId?: string;
};

export function useWheelLayerCache(stageRef: StageRef, options: UseWheelLayerCacheOptions = {}) {
  const { endWait = 220 } = options;
  const isInteractingRef = useRef(false);
  const prevLayerVisibilityRef = useRef<Array<{ layer: Konva.Layer; visible: boolean }>>([]);
  const prevLayersLengthRef = useRef(0);

  const { layerConfig, setThumbnail, stageConfig, imageLoadVersion } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
      setThumbnail: state.setThumbnail,
      stageConfig: state.stageConfig,
      imageLoadVersion: state.imageLoadVersion,
    }))
  );

  const { layers, drawingLayerId } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
      drawingLayerId: state.drawingLayer?.id,
    }))
  );

  const { setLayerThumbnail } = useThumbnailStore(
    useShallow((state) => ({
      setLayerThumbnail: state.setLayerThumbnail,
    }))
  );

  useDebounceEffect(
    () => {
      if (isInteractingRef.current) return;
      getBitmapSync();
      // 图层数量变化（初始加载、新增、删除）时全量截图，否则只截当前绘制图层
      const isStructuralChange = layers.length !== prevLayersLengthRef.current;
      prevLayersLengthRef.current = layers.length;
      captureLayerThumbnails(isStructuralChange ? undefined : drawingLayerId);
    },
    [layers, layerConfig.backgroundVisible, layerConfig.backgroundColor, imageLoadVersion],
    { wait: 20 }
  );

  // 切换图层时捕捉新选图层的缩略图（layers 不一定变化）
  useDebounceEffect(
    () => {
      if (drawingLayerId) captureLayerThumbnails(drawingLayerId);
    },
    [drawingLayerId],
    { wait: 100 }
  );

  const hideOtherLayers = useMemoizedFn(() => {
    const stage = stageRef?.current;
    if (!stage) return;

    const records: Array<{ layer: Konva.Layer; visible: boolean }> = [];
    stage.getLayers().forEach((layer) => {
      if (!layer) return;
      if (layer.attrs?.id === THUMBNAIL_LAYER_ID) return;
      if (layer.attrs?.id === MOSIC_LAYER_ID) return;
      records.push({ layer, visible: layer.visible() });
      layer.visible(false);
    });
    prevLayerVisibilityRef.current = records;

    const thumbnailLayer = stage.getLayers().find((l) => l?.attrs?.id === THUMBNAIL_LAYER_ID);
    thumbnailLayer?.visible(true);
  });

  const restoreLayers = useMemoizedFn(() => {
    const stage = stageRef?.current;
    if (!stage) return;

    prevLayerVisibilityRef.current.forEach(({ layer, visible }) => {
      try {
        layer.visible(visible);
      } catch {}
    });
    prevLayerVisibilityRef.current = [];

    const thumbnailLayer = stage.getLayers().find((l) => l?.attrs?.id === THUMBNAIL_LAYER_ID);
    thumbnailLayer?.visible(false);
    stage.batchDraw();
  });

  const {
    run: handleWheelEnd,
    cancel: cancelWheelEnd,
    flush: flushWheelEnd,
  } = useDebounceFn(
    () => {
      isInteractingRef.current = false;
      restoreLayers();
    },
    { wait: endWait }
  );

  const start = useMemoizedFn(() => {
    if (isInteractingRef.current) return;
    isInteractingRef.current = true;

    hideOtherLayers();
  });

  const end = useMemoizedFn(() => {
    cancelWheelEnd();
    isInteractingRef.current = false;
    restoreLayers();
  });

  const tick = useMemoizedFn(() => {
    start();
    handleWheelEnd();
  });

  const getBitmapSync = useMemoizedFn(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const stage = stageRef?.current;
      if (!stage) return;

      const vx = layerConfig.x * stageConfig.scale + stageConfig.x;
      const vy = layerConfig.y * stageConfig.scale + stageConfig.y;
      const vw = layerConfig.width * stageConfig.scale;
      const vh = layerConfig.height * stageConfig.scale;
      if (!vw || !vh) return;

      const pixelRatio = (WIDTH / Math.max(1, vw)) * (isMobile ? 0.2 : 0.4);
      const outW = Math.max(1, Math.round(vw * pixelRatio));
      const outH = Math.max(1, Math.round(vh * pixelRatio));

      const stageW = stage.width();
      const stageH = stage.height();
      if (!stageW || !stageH) return;

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const sortedStoreLayers = [...layers]
        .filter((l) => l.visible !== false)
        .sort((a, b) => a.order - b.order);

      let hasBackdrop = false;

      try {
        const allKonvaLayers = stage.getLayers();

        // 先绘制背景层（mosic）
        if (layerConfig.backgroundVisible) {
          const mosicKonva = allKonvaLayers.find((l) => l?.attrs?.id === MOSIC_LAYER_ID);
          const mosicCanvas = (mosicKonva?.getCanvas() as any)?._canvas as HTMLCanvasElement | undefined;
          if (mosicCanvas?.width && mosicCanvas?.height) {
            const pr = mosicCanvas.width / stageW;
            ctx.drawImage(mosicCanvas, vx * pr, vy * pr, vw * pr, vh * pr, 0, 0, outW, outH);
            hasBackdrop = true;
          }
        }

        // 逐层合成用户图层，应用 filter + blendMode
        for (let i = 0; i < sortedStoreLayers.length; i++) {
          const layerData = sortedStoreLayers[i];
          const konvaLayer = allKonvaLayers.find((l) => l?.attrs?.id === layerData.id);
          if (!konvaLayer) continue;

          const layerCanvas = (konvaLayer.getCanvas() as any)?._canvas as HTMLCanvasElement | undefined;
          if (!layerCanvas?.width || !layerCanvas?.height) continue;

          const pr = layerCanvas.width / stageW;
          const sx = vx * pr;
          const sy = vy * pr;
          const sw = vw * pr;
          const sh = vh * pr;

          ctx.save();
          const composite = !hasBackdrop && i === 0
            ? 'source-over'
            : blendModeToCompositeOperation(layerData.blendMode);
          ctx.globalCompositeOperation = composite as GlobalCompositeOperation;
          ctx.globalAlpha = 1;
          ctx.filter = layerFilterToCssFilter(layerData.filter);

          ctx.drawImage(layerCanvas, sx, sy, sw, sh, 0, 0, outW, outH);
          ctx.restore();
        }

        canvas.toBlob((blob) => {
          if (!blob) return;
          blob.arrayBuffer().then((buf) => saveStageCover(buf, 'image/webp')).catch(() => {});
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            URL.revokeObjectURL(url);
            setThumbnail(img);
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
          };
          img.src = url;
        }, 'image/webp');
      } catch {
        // tainted canvas — ImageBitmap 来源的 canvas 无法导出，跳过本次缩略图更新
      }
    }));
  });

  const captureLayerThumbnails = useMemoizedFn((targetId?: string) => {
    requestAnimationFrame(() => {
      const stage = stageRef?.current;
      if (!stage) return;

      const stageW = stage.width();
      if (!stageW || !stage.height()) return;

      const vx = layerConfig.x * stageConfig.scale + stageConfig.x;
      const vy = layerConfig.y * stageConfig.scale + stageConfig.y;
      const vw = layerConfig.width * stageConfig.scale;
      const vh = layerConfig.height * stageConfig.scale;
      if (!vw || !vh) return;

      const konvaLayers = stage.getLayers().filter((konvaLayer) => {
        const layerId = konvaLayer.attrs?.id as string | undefined;
        if (!layerId || SKIP_LAYER_IDS.has(layerId)) return false;
        if (!konvaLayer.visible()) return false;
        if (targetId && layerId !== targetId) return false;
        return true;
      });

      for (const konvaLayer of konvaLayers) {
        const layerId = konvaLayer.attrs.id as string;
        const canvasEl = (konvaLayer.getCanvas() as any)?._canvas as HTMLCanvasElement | undefined;
        if (!canvasEl?.width || !canvasEl?.height) continue;

        const pr = canvasEl.width / stageW;
        const sx = vx * pr;
        const sy = vy * pr;
        const sw = vw * pr;
        const sh = vh * pr;

        const tmp = document.createElement('canvas');
        tmp.width = LAYER_PREVIEW_WIDTH;
        tmp.height = LAYER_PREVIEW_HEIGHT;
        const ctx = tmp.getContext('2d');
        if (!ctx) continue;

        const scale = Math.min(LAYER_PREVIEW_WIDTH / sw, LAYER_PREVIEW_HEIGHT / sh);
        const drawW = sw * scale;
        const drawH = sh * scale;
        const offsetX = (LAYER_PREVIEW_WIDTH - drawW) / 2;
        const offsetY = (LAYER_PREVIEW_HEIGHT - drawH) / 2;

        try {
          const layerData = layers.find((l) => l.id === layerId);
          if (layerData?.filter) {
            const filterStr = layerFilterToCssFilter(layerData.filter);
            if (filterStr !== 'none') {
              ctx.filter = filterStr;
            }
          }

          ctx.drawImage(canvasEl, sx, sy, sw, sh, offsetX, offsetY, drawW, drawH);
          tmp.toBlob((blob) => {
            if (!blob) return;
            setLayerThumbnail(layerId, URL.createObjectURL(blob));
          }, 'image/webp');
        } catch {
          // tainted canvas，跳过该图层缩略图
        }
      }
    });
  });

  return {
    start,
    end,
    tick,
    flush: flushWheelEnd,
    cancel: cancelWheelEnd,
  };
}
