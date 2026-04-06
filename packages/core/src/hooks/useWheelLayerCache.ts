import { useDebounceEffect, useDebounceFn, useMemoizedFn } from '@zeroDraw/common';
import Konva from 'konva';
import { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { MOSIC_LAYER_ID } from '../Drawing/components/Mosic';
import { THUMBNAIL_LAYER_ID } from '../Drawing/components/Thumbnail';
import { useDrawingStore } from '../store/useDrawing';
import useLayerStore from '../store/useLayer';
import useThumbnailStore from '../store/useThumbnail';
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

  const { layerConfig, setThumbnail, stageConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
      setThumbnail: state.setThumbnail,
      stageConfig: state.stageConfig,
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
    [layers, layerConfig.backgroundVisible, layerConfig.backgroundColor],
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
    requestAnimationFrame(() => {
      const stage = stageRef?.current;
      if (!stage) return;

      const mosicLayer = stage.findOne(`#${MOSIC_LAYER_ID}`) as any;
      const thumbnailLayer = stage.findOne(`#${THUMBNAIL_LAYER_ID}`) as any;

      const prevMosicVisible = mosicLayer?.visible?.();
      const prevThumbVisible = thumbnailLayer?.visible?.();

      try {
        thumbnailLayer?.visible?.(false);

        if (!layerConfig.backgroundVisible) {
          mosicLayer?.visible?.(false);
        }

        const x = layerConfig.x * stageConfig.scale + stageConfig.x;
        const y = layerConfig.y * stageConfig.scale + stageConfig.y;
        const width = layerConfig.width * stageConfig.scale;
        const height = layerConfig.height * stageConfig.scale;

        const pixelRatio = (WIDTH / Math.max(1, width)) * (isMobile ? 0.2 : 0.4);

        const canvas = stage.toCanvas({
          x,
          y,
          width,
          height,
          pixelRatio,
        }) as HTMLCanvasElement;

        canvas.toBlob((blob) => {
          if (!blob) return;
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
      } finally {
        if (thumbnailLayer && typeof prevThumbVisible === 'boolean') {
          thumbnailLayer.visible(prevThumbVisible);
        }
        if (mosicLayer && typeof prevMosicVisible === 'boolean') {
          mosicLayer.visible(prevMosicVisible);
        }
      }
    });
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

        ctx.drawImage(canvasEl, sx, sy, sw, sh, offsetX, offsetY, drawW, drawH);
        tmp.toBlob((blob) => {
          if (!blob) return;
          setLayerThumbnail(layerId, URL.createObjectURL(blob));
        }, 'image/webp');
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
