import { useDebounceEffect, useDebounceFn, useMemoizedFn } from '@zeroDraw/common';
import Konva from 'konva';
import { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { THUMBNAIL_LAYER_ID } from '../Drawing/components/Thumbnail';
import { useDrawingStore } from '../store/useDrawing';
import useLayerStore from '../store/useLayer';
import { WIDTH } from '../utils/drawing';
import { isMobile } from '../utils/platform';

type StageRef = React.RefObject<Konva.Stage> | null | undefined;

export type UseWheelLayerCacheOptions = {
  endWait?: number;
  topLayerId?: string;
};

export function useWheelLayerCache(stageRef: StageRef, options: UseWheelLayerCacheOptions = {}) {
  const { endWait = 220 } = options;
  const isInteractingRef = useRef(false);
  const prevLayerVisibilityRef = useRef<Array<{ layer: Konva.Layer; visible: boolean }>>([]);

  const { layerConfig, setThumbnail, stageConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
      setThumbnail: state.setThumbnail,
      stageConfig: state.stageConfig,
    }))
  );

  const { layers } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
    }))
  );

  useDebounceEffect(
    () => {
      if (isInteractingRef.current) return;
      getBitmapSync();
    },
    [layers, layerConfig.backgroundVisible, layerConfig.backgroundColor],
    {
      wait: 20,
    }
  );

  const hideOtherLayers = useMemoizedFn(() => {
    const stage = stageRef?.current;
    if (!stage) return;

    const records: Array<{ layer: Konva.Layer; visible: boolean }> = [];
    stage.getLayers().forEach((layer) => {
      if (!layer) return;
      if (layer.attrs?.id === THUMBNAIL_LAYER_ID) return;
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
    requestAnimationFrame(async () => {
      const stage = stageRef?.current;
      if (!stage) return;

      const x = layerConfig.x * stageConfig.scale + stageConfig.x;
      const y = layerConfig.y * stageConfig.scale + stageConfig.y;
      const width = layerConfig.width * stageConfig.scale;
      const height = layerConfig.height * stageConfig.scale;

      const pixelRatio = (WIDTH / Math.max(1, width)) * (isMobile ? 0.2 : 0.4);

      const blob = (await stage.toBlob({
        x,
        y,
        width,
        height,
        pixelRatio,
        mimeType: 'image/webp',
      })) as Blob;

      const image = new window.Image();
      image.src = URL.createObjectURL(blob);
      image.onload = () => {
        URL.revokeObjectURL(image.src);
        setThumbnail(image);
      };
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
