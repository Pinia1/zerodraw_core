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
import { exportStageWithBlendModes, layerFilterToCssFilter } from '../utils/BlendMode';
import { WIDTH } from '../utils/drawing';
import { isMobile } from '../utils/platform';

export const SYMMETRY_LAYER_ID = '__interaction_symmetry_layer__';
const LAYER_PREVIEW_WIDTH = 620;
const LAYER_PREVIEW_HEIGHT = 350;
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

  const { layerConfig, setThumbnail, imageLoadVersion } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
      setThumbnail: state.setThumbnail,
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
      if ([THUMBNAIL_LAYER_ID, MOSIC_LAYER_ID, SYMMETRY_LAYER_ID].includes(layer.attrs?.id ?? ''))
        return;
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
    requestAnimationFrame(() =>
      requestAnimationFrame(async () => {
        const stage = stageRef?.current;
        if (!stage || !layerConfig.width || !layerConfig.height) return;

        const thumbWidth = Math.round(WIDTH * (isMobile ? 0.2 : 0.4));

        try {
          const dataUrl = await exportStageWithBlendModes(stage, layers, {
            applyStageTransform: false,
            cropX: layerConfig.x,
            cropY: layerConfig.y,
            cropWidth: layerConfig.width,
            cropHeight: layerConfig.height,
            targetWidth: thumbWidth,
            backgroundColor: layerConfig.backgroundVisible
              ? layerConfig.backgroundColor
              : 'transparent',
            mimeType: 'image/webp',
            quality: 0.8,
          });

          if (!dataUrl) return;

          const res = await fetch(dataUrl);
          const blob = await res.blob();
          blob
            .arrayBuffer()
            .then((buf) => saveStageCover(buf, 'image/webp'))
            .catch(() => {});

          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => setThumbnail(img);
          img.src = dataUrl;
        } catch {
          // tainted canvas
        }
      })
    );
  });

  const captureLayerThumbnails = useMemoizedFn((targetId?: string) => {
    requestAnimationFrame(() => {
      const stage = stageRef?.current;
      if (!stage || !layerConfig.width || !layerConfig.height) return;

      const cropX = layerConfig.x;
      const cropY = layerConfig.y;
      const cropW = layerConfig.width;
      const cropH = layerConfig.height;

      const targetLayers = layers.filter((l) => {
        if (l.visible === false) return false;
        if (targetId && l.id !== targetId) return false;
        return true;
      });

      const stageLayers = stage.getLayers();

      for (const layerData of targetLayers) {
        const liveLayer = stageLayers.find((l) => l?.attrs?.id === layerData.id);
        if (!liveLayer) continue;

        try {
          const offContainer = document.createElement('div');
          const offW = Math.max(stage.width(), cropX + cropW);
          const offH = Math.max(stage.height(), cropY + cropH);
          const offStage = new Konva.Stage({ container: offContainer, width: offW, height: offH });
          const cloned = liveLayer.clone({ listening: false });
          offStage.add(cloned);
          offStage.draw();

          const clonedCanvas = (cloned.getCanvas() as any)?._canvas as
            | HTMLCanvasElement
            | undefined;
          if (!clonedCanvas?.width || !clonedCanvas?.height) {
            offStage.destroy();
            continue;
          }

          const pr = clonedCanvas.width / offW;
          const sx = cropX * pr;
          const sy = cropY * pr;
          const sw = cropW * pr;
          const sh = cropH * pr;

          const tmp = document.createElement('canvas');
          tmp.width = LAYER_PREVIEW_WIDTH;
          tmp.height = LAYER_PREVIEW_HEIGHT;
          const ctx = tmp.getContext('2d');
          if (!ctx) {
            offStage.destroy();
            continue;
          }

          const scale = Math.min(LAYER_PREVIEW_WIDTH / sw, LAYER_PREVIEW_HEIGHT / sh);
          const drawW = sw * scale;
          const drawH = sh * scale;
          const offsetX = (LAYER_PREVIEW_WIDTH - drawW) / 2;
          const offsetY = (LAYER_PREVIEW_HEIGHT - drawH) / 2;

          const filterStr = layerFilterToCssFilter(layerData.filter);
          if (filterStr !== 'none') {
            ctx.filter = filterStr;
          }

          ctx.drawImage(clonedCanvas, sx, sy, sw, sh, offsetX, offsetY, drawW, drawH);
          offStage.destroy();

          tmp.toBlob((blob) => {
            if (!blob) return;
            setLayerThumbnail(layerData.id, URL.createObjectURL(blob));
          }, 'image/webp');
        } catch {
          // tainted canvas
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
