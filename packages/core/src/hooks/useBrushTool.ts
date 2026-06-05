import { useMemoizedFn } from '@zeroDraw/common';
import type {
  BrushJSON,
  MyPaintBrush,
  MyPaintEngine,
  MyPaintStroke,
  MyPaintSurface,
  Rect,
  ShapePoint,
} from '@zeroDraw/wasm';
import type Konva from 'konva';
import MyPaint, { BUILTIN_BRUSHES, hexToHsv } from '@zeroDraw/wasm';
import { useEffect, useRef } from 'react';
import type { NormalizedPointerEvent } from '../input/types';
import type { LayerConfigTypes, StageConfigTypes } from '../types/Drawing';

const DEFAULT_BRUSH = BUILTIN_BRUSHES['印象派'] as BrushJSON;

const getBrushBaseValue = (brush: BrushJSON, key: string, fallback: number) => {
  return brush.settings[key]?.base_value ?? fallback;
};

const hasBrushMapping = (brush: BrushJSON, key: string, input: string) => {
  return !!brush.settings[key]?.inputs?.[input]?.length;
};

export interface UseBrushToolReturn {
  /** 当前笔刷渲染的离屏 canvas（交给 DrawLayer 显示） */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onBrushDown: (input: NormalizedPointerEvent) => void;
  onBrushMove: (input: NormalizedPointerEvent) => void;
  onBrushUp: () => void;
  /** 将当前笔画脏区导出为 PNG ArrayBuffer（不清空画布） */
  commitBrushStroke: () => Promise<{ buffer: ArrayBuffer; rect: Rect } | null>;
  /** 清空离屏 canvas 和 WASM surface，为下一笔做准备 */
  clearBrushCanvas: () => void;
  /** 获取本次笔画在画布坐标系内收集的点序列（用于图形识别） */
  getStrokePoints: () => ShapePoint[];
  /** 清空画布并用给定点序列重绘（图形识别矫正后调用） */
  redrawWithShapePoints: (pts: ShapePoint[]) => void;
}

export function useBrushTool(
  layerConfig: LayerConfigTypes,
  _stageConfig: StageConfigTypes,
  fillColor: string,
  strokeWidth: number,
  opacity: number,
  brushConfig: BrushJSON | undefined,
  /** 每次笔刷画完一帧后调用，触发 Konva 重绘 */
  onRedraw: () => void
): UseBrushToolReturn {
  const engineRef = useRef<MyPaintEngine | null>(null);
  const surfaceRef = useRef<MyPaintSurface | null>(null);
  const brushRef = useRef<MyPaintBrush | null>(null);
  const strokeRef = useRef<MyPaintStroke | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTimeRef  = useRef<number>(0);
  const moveCountRef = useRef<number>(0);
  const strokeBoundsRef = useRef<Rect | null>(null);
  const strokePtsRef = useRef<ShapePoint[]>([]);
  const layerCfgRef  = useRef(layerConfig);
  layerCfgRef.current = layerConfig;

  // 初始化 WASM 引擎（只做一次）
  useEffect(() => {
    let cancelled = false;
    MyPaint.create().then((engine) => {
      if (!cancelled) engineRef.current = engine;
    });
    return () => {
      cancelled = true;
      surfaceRef.current?.destroy();
      brushRef.current?.destroy();
      surfaceRef.current = null;
      brushRef.current = null;
      engineRef.current = null;
    };
  }, []);

  /** 确保 surface 和 canvas 尺寸与 layerConfig 一致 */
  const ensureSurface = useMemoizedFn((): boolean => {
    const { width, height } = layerCfgRef.current;
    if (!width || !height || !engineRef.current) return false;

    if (
      !surfaceRef.current ||
      surfaceRef.current.width !== width ||
      surfaceRef.current.height !== height
    ) {
      surfaceRef.current?.destroy();
      const w = Math.floor(width);
      const h = Math.floor(height);
      surfaceRef.current = engineRef.current.createSurface(w, h);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvasRef.current = canvas;
    }
    return true;
  });

  const strokeWidthRef = useRef(strokeWidth);
  const opacityRef = useRef(opacity);
  const brushConfigRef = useRef(brushConfig);
  const loadedBrushConfigRef = useRef<BrushJSON | null>(null);
  strokeWidthRef.current = strokeWidth;
  opacityRef.current = opacity;
  brushConfigRef.current = brushConfig;

  /** 确保笔刷存在，并同步颜色、粗细、透明度 */
  const ensureBrush = useMemoizedFn((color: string): boolean => {
    if (!engineRef.current) return false;
    const currentBrushConfig = brushConfigRef.current || DEFAULT_BRUSH;
    if (brushRef.current && loadedBrushConfigRef.current !== currentBrushConfig) {
      brushRef.current.destroy();
      brushRef.current = null;
      loadedBrushConfigRef.current = null;
    }
    if (!brushRef.current) {
      brushRef.current = engineRef.current.createBrush();
      const loaded = brushRef.current.fromJSON(currentBrushConfig);
      if (!loaded) {
        brushRef.current.destroy();
        brushRef.current = engineRef.current.createBrush().fromDefaults();
      }
      loadedBrushConfigRef.current = currentBrushConfig;
    }
    const hsv = hexToHsv(color);
    // strokeWidth 是直径像素，libmypaint radius_logarithmic = ln(radius) = ln(strokeWidth/2)
    const radiusLog = Math.log(Math.max(1, strokeWidthRef.current / 2));
    const baseOpaque = getBrushBaseValue(currentBrushConfig, 'opaque', 1);
    const opaque = Math.min(2, Math.max(0, baseOpaque * opacityRef.current));
    const baseSmudge = getBrushBaseValue(currentBrushConfig, 'smudge', 0);
    const smudge = hasBrushMapping(currentBrushConfig, 'smudge', 'stroke')
      ? Math.min(baseSmudge, 0.2)
      : baseSmudge;
    brushRef.current
      .set('color_h', hsv.h)
      .set('color_s', hsv.s)
      .set('color_v', hsv.v)
      .set('radius_logarithmic', radiusLog)
      .set('opaque', opaque)
      .set('smudge', smudge);
    return true;
  });

  /** 将脏区域渲染到离屏 canvas */
  const renderROI = useMemoizedFn((roi: Rect | null) => {
    const surface = surfaceRef.current;
    const canvas = canvasRef.current;
    if (!surface || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (roi && roi.width > 0 && roi.height > 0) {
      const bounds = strokeBoundsRef.current;
      if (!bounds) {
        strokeBoundsRef.current = { ...roi };
      } else {
        const minX = Math.min(bounds.x, roi.x);
        const minY = Math.min(bounds.y, roi.y);
        const maxX = Math.max(bounds.x + bounds.width, roi.x + roi.width);
        const maxY = Math.max(bounds.y + bounds.height, roi.y + roi.height);
        strokeBoundsRef.current = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        };
      }
    }
    surface.renderROIToCanvas(ctx, roi);
  });

  /** 将 coalesced PointerEvent 的 clientX/Y 转为画布坐标 */
  const clientToCanvas = useMemoizedFn(
    (clientX: number, clientY: number, stage: Konva.Stage) => {
      const { x: lx, y: ly } = layerCfgRef.current;
      const stageEl = stage.container();
      const rect = stageEl.getBoundingClientRect();
      const transform = stage.getAbsoluteTransform().copy().invert();
      const stagePoint = transform.point({ x: clientX - rect.left, y: clientY - rect.top });
      const stageX = stagePoint.x;
      const stageY = stagePoint.y;
      return { x: stageX - lx, y: stageY - ly };
    }
  );

  const onBrushDown = useMemoizedFn((input: NormalizedPointerEvent) => {
    if (!input.canvasPoint) return;
    if (!ensureSurface() || !ensureBrush(fillColor)) return;

    const raw = input.konvaEvent.evt as PointerEvent;
    const xtilt = (raw.tiltX || 0) / 60;
    const ytilt = (raw.tiltY || 0) / 60;

    moveCountRef.current = 0;
    strokeBoundsRef.current = null;
    strokePtsRef.current = [{ x: input.canvasPoint.x, y: input.canvasPoint.y }];
    strokeRef.current = surfaceRef.current!.bindBrush(brushRef.current!);
    strokeRef.current.begin();
    strokeRef.current.to(input.canvasPoint.x, input.canvasPoint.y, input.pressure || 0.5, {
      dtime: 0.001,
      xtilt,
      ytilt,
    });

    lastTimeRef.current = performance.now();
    renderROI(strokeRef.current.flush());
    onRedraw();
  });

  const onBrushMove = useMemoizedFn((input: NormalizedPointerEvent) => {
    if (!strokeRef.current) return;

    const now = performance.now();
    const totalDt = Math.max((now - lastTimeRef.current) / 1000, 0.0005);
    lastTimeRef.current = now;

    const raw = input.konvaEvent.evt as PointerEvent;
    const stage = input.konvaEvent.target.getStage();

    moveCountRef.current += 1;

    // 优先使用 coalesced events 获得更平滑的轨迹
    const coalesced = raw.getCoalescedEvents ? raw.getCoalescedEvents() : [];
    if (coalesced.length > 1 && stage) {
      const dtPer = totalDt / coalesced.length;
      for (const ce of coalesced) {
        const pt = clientToCanvas(ce.clientX, ce.clientY, stage);
        strokePtsRef.current.push(pt);
        const xtilt = (ce.tiltX || 0) / 60;
        const ytilt = (ce.tiltY || 0) / 60;
        strokeRef.current.to(pt.x, pt.y, ce.pressure || input.pressure || 0.5, {
          dtime: dtPer,
          xtilt,
          ytilt,
        });
      }
      renderROI(strokeRef.current.flush());
    } else {
      if (!input.canvasPoint) return;
      strokePtsRef.current.push({ x: input.canvasPoint.x, y: input.canvasPoint.y });
      const xtilt = (raw.tiltX || 0) / 60;
      const ytilt = (raw.tiltY || 0) / 60;
      strokeRef.current.to(input.canvasPoint.x, input.canvasPoint.y, input.pressure || 0.5, {
        dtime: totalDt,
        xtilt,
        ytilt,
      });
      renderROI(strokeRef.current.flush());
    }
    onRedraw();
  });

  const onBrushUp = useMemoizedFn(() => {
    if (!strokeRef.current) return;
    renderROI(strokeRef.current.end());
    strokeRef.current = null;
    onRedraw();
  });

  const commitBrushStroke = useMemoizedFn(async (): Promise<{ buffer: ArrayBuffer; rect: Rect } | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    // 移动次数不足时视为误触，清空画布但不写入历史
    if (moveCountRef.current < 2) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      surfaceRef.current?.clear();
      return null;
    }
    const bounds = strokeBoundsRef.current;
    if (!bounds) return null;
    const padding = 4;
    const rect: Rect = {
      x: Math.max(0, Math.floor(bounds.x - padding)),
      y: Math.max(0, Math.floor(bounds.y - padding)),
      width: 0,
      height: 0,
    };
    rect.width = Math.min(canvas.width - rect.x, Math.ceil(bounds.x + bounds.width + padding) - rect.x);
    rect.height = Math.min(canvas.height - rect.y, Math.ceil(bounds.y + bounds.height + padding) - rect.y);
    if (rect.width <= 0 || rect.height <= 0) return null;

    const cropped = document.createElement('canvas');
    cropped.width = rect.width;
    cropped.height = rect.height;
    const ctx = cropped.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

    const blob = await new Promise<Blob | null>((resolve) => cropped.toBlob(resolve, 'image/png'));
    if (!blob) return null;
    return { buffer: await blob.arrayBuffer(), rect };
  });

  const clearBrushCanvas = useMemoizedFn(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    surfaceRef.current?.clear();
    strokeBoundsRef.current = null;
  });

  const getStrokePoints = useMemoizedFn((): ShapePoint[] => strokePtsRef.current);

  /** 清空画布，用标准图形点序列重绘（图形识别矫正后调用） */
  const redrawWithShapePoints = useMemoizedFn((pts: ShapePoint[]): void => {
    if (!surfaceRef.current || !brushRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    surfaceRef.current.clear();

    const stroke = surfaceRef.current.bindBrush(brushRef.current);
    stroke.begin();

    // 用匀速（200px/s）模拟 dtime，让笔刷动态保持一致
    const SPEED = 200;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const dtime =
        i === 0
          ? 0.001
          : Math.max(0.001, Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) / SPEED);
      stroke.to(p.x, p.y, 0.5, { dtime });
      renderROI(stroke.flush());
    }
    renderROI(stroke.end());
    onRedraw();
  });

  return {
    canvasRef,
    onBrushDown,
    onBrushMove,
    onBrushUp,
    commitBrushStroke,
    clearBrushCanvas,
    getStrokePoints,
    redrawWithShapePoints,
  };
}
