import { useDebounceFn, useMemoizedFn, useUpdateEffect } from '@zeroDraw/common';
import Konva from 'konva';
import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { THUMBNAIL_LAYER_ID } from '../Drawing/components/Thumbnail';
import { useDrawingStore } from '../store/useDrawing';
import useLayerStore from '../store/useLayer';
import { createBitmapWorker } from '../utils/bitmapWorker';

type StageRef = React.RefObject<Konva.Stage> | null | undefined;

export type UseWheelLayerCacheOptions = {
  /**
   * 用防抖来模拟 wheel end：最后一次 wheel 后静默多久算结束
   */
  endWait?: number;
  topLayerId?: string;
};

/**
 * wheel 没有 end 事件：用防抖来模拟 wheel end。
 *
 * 交互期间（wheel/drag/touch gesture）：
 * - 截取一张位图（thumbnail）
 * - 隐藏其它 Konva layer
 * - 只显示一个“预览 layer”，用位图替代真实渲染，提升交互性能
 */
export function useWheelLayerCache(stageRef: StageRef, options: UseWheelLayerCacheOptions = {}) {
  const { endWait = 220 } = options;
  const isInteractingRef = useRef(false);
  const prevLayerVisibilityRef = useRef<Array<{ layer: Konva.Layer; visible: boolean }>>([]);

  const { bindBitmapWorkerRef, layerConfig, setThumbnail, thumbnail, stageConfig } =
    useDrawingStore(
      useShallow((state) => ({
        bindBitmapWorkerRef: state.bindBitmapWorkerRef,
        layerConfig: state.layerConfig,
        setThumbnail: state.setThumbnail,
        thumbnail: state.thumbnail,
        stageConfig: state.stageConfig,
      }))
    );

  const { layers } = useLayerStore(
    useShallow((state) => ({
      layers: state.layers,
    }))
  );

  useEffect(() => {
    bindBitmapWorkerRef(createBitmapWorker());
    return () => {
      bindBitmapWorkerRef(null);
    };
  }, []);

  useUpdateEffect(() => {
    // 图层内容变更时，提前刷新一次位图，避免下次交互进入预览时还要现截
    // 交互过程中不刷新，避免拖拽/缩放期间反复 toBlob。
    if (isInteractingRef.current) return;
    getBitmap();
  }, [layers]);

  const hideOtherLayers = useMemoizedFn(() => {
    const stage = stageRef?.current;
    if (!stage) return;

    // 记录并隐藏其它 layer（只留预览 layer 渲染）
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
      } catch {
        // layer 可能已被卸载/销毁，忽略
      }
    });
    prevLayerVisibilityRef.current = [];

    // 退出预览：隐藏 thumbnail layer（不靠 React props 控制），并释放 thumbnail 内容
    const thumbnailLayer = stage.getLayers().find((l) => l?.attrs?.id === THUMBNAIL_LAYER_ID);
    thumbnailLayer?.visible(false);
    // setThumbnail(null);
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

    // 只有当 thumbnail 已经存在（或我们刚刚 capture 成功）时才隐藏其它 layer，避免直接白屏。
    if (useDrawingStore.getState().thumbnail) {
      hideOtherLayers();
    }
  });

  const end = useMemoizedFn(() => {
    cancelWheelEnd();
    isInteractingRef.current = false;
    restoreLayers();
    // 结束后清理，避免不交互时仍保留大图占内存（Thumbnail layer 仍在，但没有 image 就不会渲染）
    setThumbnail(null);
  });

  const tick = useMemoizedFn(() => {
    start();
    handleWheelEnd();
  });

  const getBitmap = async () => {
    if (!stageRef?.current) return;
    const TARGET_W = 1920;

    const x = layerConfig.x * stageConfig.scale + stageConfig.x;
    const y = layerConfig.y * stageConfig.scale + stageConfig.y;
    const width = layerConfig.width * stageConfig.scale;
    const height = layerConfig.height * stageConfig.scale;

    const pixelRatio = (TARGET_W / Math.max(1, width)) * 0.4;
    const blob = (await stageRef?.current.toBlob({
      x,
      y,
      width,
      height,
      pixelRatio,
    })) as Blob;
    const image = new window.Image();
    image.src = URL.createObjectURL(blob);
    image.onload = () => {
      setThumbnail(image);
    };
  };

  return {
    start,
    end,
    tick,
    flush: flushWheelEnd,
    cancel: cancelWheelEnd,
  };
}
