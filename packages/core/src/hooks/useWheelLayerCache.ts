import { useDebounceFn, useMemoizedFn } from '@zeroDraw/common';
import Konva from 'konva';
import { useRef } from 'react';

type StageRef = React.RefObject<Konva.Stage> | null | undefined;

export type UseWheelLayerCacheOptions = {
  /**
   * cache 的像素倍率（越大越清晰也越耗时/内存）
   * - number: 固定值
   * - (layerCount) => number: 根据图层数量动态计算
   */
  pixelRatio?: number | ((layerCount: number) => number);
  /**
   * 跳过最顶层的若干个 Konva Layer（通常最顶层是交互/临时层，不适合 cache）
   * - 0: 不跳过
   * - 1: 跳过最顶层 1 个（默认）
   */
  excludeTopLayers?: number;
  /**
   * 用防抖来模拟 wheel end：最后一次 wheel 后静默多久算结束
   */
  endWait?: number;
  topLayerId?: string;
};

/**
 * wheel 没有 end 事件：用“进入 wheel 序列时 cache 一次 + wheel 停止(防抖)后 clear”来避免频繁 cache/clear。
 */
export function useWheelLayerCache(stageRef: StageRef, options: UseWheelLayerCacheOptions = {}) {
  const { pixelRatio, endWait = 220, excludeTopLayers = 1, topLayerId } = options;
  const isWheelingRef = useRef(false);

  const getAutoPixelRatio = useMemoizedFn((layerCount: number) => {
    // 约定：根据图层量自动降采样，避免 cache 成本过高
    if (layerCount <= 0) return 0.9;
    if (layerCount <= 5) return 0.9;
    if (layerCount <= 10) return 0.5;
    if (layerCount <= 15) return 0.4;
    // >15：再降一点作为兜底（可后续按体验调整）
    return 0.35;
  });

  const resolvePixelRatio = useMemoizedFn((layerCount: number) => {
    if (typeof pixelRatio === 'function') return pixelRatio(layerCount);
    if (typeof pixelRatio === 'number') return pixelRatio;
    return getAutoPixelRatio(layerCount);
  });

  const cacheVisibleLayersOnce = useMemoizedFn(() => {
    requestAnimationFrame(() => {
      const layers = stageRef?.current?.getLayers() ?? [];
      const pr = resolvePixelRatio(layers.length);
      layers.forEach((layer) => {
        if (layer.attrs.id === topLayerId) return;
        if (layer.visible() && !layer.isCached()) {
          layer.cache({ pixelRatio: pr });
        }
      });
    });
  });

  const clearCachedLayers = useMemoizedFn(() => {
    requestAnimationFrame(() => {
      const layers = stageRef?.current?.getLayers() ?? [];
      layers.forEach((layer) => {
        if (layer.attrs.id === topLayerId) return;
        if (layer.isCached()) layer.clearCache();
      });
    });
  });

  const {
    run: handleWheelEnd,
    cancel: cancelWheelEnd,
    flush: flushWheelEnd,
  } = useDebounceFn(
    () => {
      isWheelingRef.current = false;
      clearCachedLayers();
    },
    { wait: endWait }
  );

  const start = useMemoizedFn(() => {
    if (isWheelingRef.current) return;
    isWheelingRef.current = true;
    cacheVisibleLayersOnce();
  });

  const end = useMemoizedFn(() => {
    cancelWheelEnd();
    isWheelingRef.current = false;
    clearCachedLayers();
  });

  const tick = useMemoizedFn(() => {
    start();
    handleWheelEnd();
  });

  return {
    start,
    end,
    tick,
    flush: flushWheelEnd,
    cancel: cancelWheelEnd,
  };
}
