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
import MyPaint, { BUILTIN_BRUSHES, hexToHsv } from '@zeroDraw/wasm';
import type Konva from 'konva';
import { useEffect, useRef } from 'react';
import type { NormalizedPointerEvent } from '../input/types';
import useSymmetryStore from '../store/useSymmetry';
import type { LayerConfigTypes, StageConfigTypes } from '../types/Drawing';
import { reflectPoint } from '../utils/symmetry';

const DEFAULT_BRUSH = BUILTIN_BRUSHES['印象派'] as BrushJSON;

const getBrushBaseValue = (brush: BrushJSON, key: string, fallback: number) => {
  return brush.settings[key]?.base_value ?? fallback;
};

const hasBrushMapping = (brush: BrushJSON, key: string, input: string) => {
  return !!brush.settings[key]?.inputs?.[input]?.length;
};

export interface UseBrushToolReturn {
  /** 主笔刷离屏 canvas */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** 对称镜像离屏 canvas（对称关闭时为 null） */
  mirrorCanvasRef: React.RefObject<HTMLCanvasElement | null>;
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
  // ---- 主笔刷 ----
  const engineRef = useRef<MyPaintEngine | null>(null);
  const surfaceRef = useRef<MyPaintSurface | null>(null);
  const brushRef = useRef<MyPaintBrush | null>(null);
  const strokeRef = useRef<MyPaintStroke | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ---- 对称镜像笔刷（与主笔刷共享同一个 engine，各自独立 surface） ----
  const surfaceMirrorRef = useRef<MyPaintSurface | null>(null);
  const brushMirrorRef = useRef<MyPaintBrush | null>(null);
  const strokeMirrorRef = useRef<MyPaintStroke | null>(null);
  const canvasMirrorRef = useRef<HTMLCanvasElement | null>(null);
  const strokeBoundsMirrorRef = useRef<Rect | null>(null);

  const lastTimeRef = useRef<number>(0);
  const moveCountRef = useRef<number>(0);
  const strokeBoundsRef = useRef<Rect | null>(null);
  const strokePtsRef = useRef<ShapePoint[]>([]);
  const layerCfgRef = useRef(layerConfig);
  layerCfgRef.current = layerConfig;

  useEffect(() => {
    let cancelled = false;
    MyPaint.create().then((engine) => {
      if (!cancelled) engineRef.current = engine;
    });
    return () => {
      cancelled = true;
      surfaceRef.current?.destroy();
      brushRef.current?.destroy();
      surfaceMirrorRef.current?.destroy();
      brushMirrorRef.current?.destroy();
      surfaceRef.current = null;
      brushRef.current = null;
      surfaceMirrorRef.current = null;
      brushMirrorRef.current = null;
      engineRef.current = null;
    };
  }, []);

  const ensureSurface = useMemoizedFn((): boolean => {
    const { width, height } = layerCfgRef.current;
    if (!width || !height || !engineRef.current) return false;

    const w = Math.floor(width);
    const h = Math.floor(height);

    if (!surfaceRef.current || surfaceRef.current.width !== w || surfaceRef.current.height !== h) {
      surfaceRef.current?.destroy();
      surfaceRef.current = engineRef.current.createSurface(w, h);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvasRef.current = canvas;
    }

    if (
      !surfaceMirrorRef.current ||
      surfaceMirrorRef.current.width !== w ||
      surfaceMirrorRef.current.height !== h
    ) {
      surfaceMirrorRef.current?.destroy();
      surfaceMirrorRef.current = engineRef.current.createSurface(w, h);
      const mc = document.createElement('canvas');
      mc.width = w;
      mc.height = h;
      canvasMirrorRef.current = mc;
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

  const applyBrushParams = useMemoizedFn((brush: MyPaintBrush, color: string, cfg: BrushJSON) => {
    const hsv = hexToHsv(color);
    const radiusLog = Math.log(Math.max(1, strokeWidthRef.current / 2));
    const baseOpaque = getBrushBaseValue(cfg, 'opaque', 1);
    const opaque = Math.min(2, Math.max(0, baseOpaque * opacityRef.current));
    const baseSmudge = getBrushBaseValue(cfg, 'smudge', 0);
    const smudge = hasBrushMapping(cfg, 'smudge', 'stroke')
      ? Math.min(baseSmudge, 0.2)
      : baseSmudge;
    brush
      .set('color_h', hsv.h)
      .set('color_s', hsv.s)
      .set('color_v', hsv.v)
      .set('radius_logarithmic', radiusLog)
      .set('opaque', opaque)
      .set('smudge', smudge);
  });

  const ensureBrush = useMemoizedFn((color: string): boolean => {
    if (!engineRef.current) return false;
    const cfg = brushConfigRef.current || DEFAULT_BRUSH;

    // 配置变了则销毁重建
    if (brushRef.current && loadedBrushConfigRef.current !== cfg) {
      brushRef.current.destroy();
      brushMirrorRef.current?.destroy();
      brushRef.current = null;
      brushMirrorRef.current = null;
      loadedBrushConfigRef.current = null;
    }

    if (!brushRef.current) {
      brushRef.current = engineRef.current.createBrush();
      const loaded = brushRef.current.fromJSON(cfg);
      if (!loaded) brushRef.current = engineRef.current.createBrush().fromDefaults();

      brushMirrorRef.current = engineRef.current.createBrush();
      const loadedM = brushMirrorRef.current.fromJSON(cfg);
      if (!loadedM) brushMirrorRef.current = engineRef.current.createBrush().fromDefaults();

      loadedBrushConfigRef.current = cfg;
    }

    applyBrushParams(brushRef.current, color, cfg);
    applyBrushParams(brushMirrorRef.current!, color, cfg);
    return true;
  });

  const expandBounds = (boundsRef: React.MutableRefObject<Rect | null>, roi: Rect | null) => {
    if (!roi || roi.width <= 0 || roi.height <= 0) return;
    const b = boundsRef.current;
    if (!b) {
      boundsRef.current = { ...roi };
      return;
    }
    const minX = Math.min(b.x, roi.x);
    const minY = Math.min(b.y, roi.y);
    const maxX = Math.max(b.x + b.width, roi.x + roi.width);
    const maxY = Math.max(b.y + b.height, roi.y + roi.height);
    boundsRef.current = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  };

  const renderROI = useMemoizedFn((roi: Rect | null) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !surfaceRef.current) return;
    expandBounds(strokeBoundsRef, roi);
    surfaceRef.current.renderROIToCanvas(ctx, roi);
  });

  const renderROIMirror = useMemoizedFn((roi: Rect | null) => {
    const ctx = canvasMirrorRef.current?.getContext('2d');
    if (!ctx || !surfaceMirrorRef.current) return;
    expandBounds(strokeBoundsMirrorRef, roi);
    surfaceMirrorRef.current.renderROIToCanvas(ctx, roi);
  });

  const getSymmetry = () => {
    const { mode, position, rotation } = useSymmetryStore.getState();
    return { active: mode !== 'Off', position, rotation };
  };

  const reflectCanvasPoint = (x: number, y: number) => {
    const { position, rotation } = useSymmetryStore.getState();
    return reflectPoint(x, y, position.x, position.y, rotation);
  };

  const clientToCanvas = useMemoizedFn((clientX: number, clientY: number, stage: Konva.Stage) => {
    const { x: lx, y: ly } = layerCfgRef.current;
    const rect = stage.container().getBoundingClientRect();
    const transform = stage.getAbsoluteTransform().copy().invert();
    const sp = transform.point({ x: clientX - rect.left, y: clientY - rect.top });
    return { x: sp.x - lx, y: sp.y - ly };
  });

  const onBrushDown = useMemoizedFn((input: NormalizedPointerEvent) => {
    if (!input.canvasPoint) return;
    if (!ensureSurface() || !ensureBrush(fillColor)) return;

    const raw = input.konvaEvent.evt as PointerEvent;
    const xtilt = (raw.tiltX || 0) / 60;
    const ytilt = (raw.tiltY || 0) / 60;
    const { x, y } = input.canvasPoint;
    const pressure = input.pressure || 0.5;

    moveCountRef.current = 0;
    strokeBoundsRef.current = null;
    strokeBoundsMirrorRef.current = null;
    strokePtsRef.current = [{ x, y }];

    // 主笔刷
    strokeRef.current = surfaceRef.current!.bindBrush(brushRef.current!);
    strokeRef.current.begin();
    strokeRef.current.to(x, y, pressure, { dtime: 0.001, xtilt, ytilt });
    lastTimeRef.current = performance.now();
    renderROI(strokeRef.current.flush());

    // 镜像笔刷
    const sym = getSymmetry();
    if (sym.active && surfaceMirrorRef.current && brushMirrorRef.current) {
      const mp = reflectCanvasPoint(x, y);
      strokeMirrorRef.current = surfaceMirrorRef.current.bindBrush(brushMirrorRef.current);
      strokeMirrorRef.current.begin();
      strokeMirrorRef.current.to(mp.x, mp.y, pressure, { dtime: 0.001, xtilt, ytilt });
      renderROIMirror(strokeMirrorRef.current.flush());
    } else {
      strokeMirrorRef.current = null;
    }

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

    const coalesced = raw.getCoalescedEvents ? raw.getCoalescedEvents() : [];
    if (coalesced.length > 1 && stage) {
      const dtPer = totalDt / coalesced.length;
      for (const ce of coalesced) {
        const pt = clientToCanvas(ce.clientX, ce.clientY, stage);
        const pressure = ce.pressure || input.pressure || 0.5;
        const xtilt = (ce.tiltX || 0) / 60;
        const ytilt = (ce.tiltY || 0) / 60;

        strokePtsRef.current.push(pt);
        strokeRef.current.to(pt.x, pt.y, pressure, { dtime: dtPer, xtilt, ytilt });

        if (strokeMirrorRef.current) {
          const mp = reflectCanvasPoint(pt.x, pt.y);
          strokeMirrorRef.current.to(mp.x, mp.y, pressure, { dtime: dtPer, xtilt, ytilt });
        }
      }
      renderROI(strokeRef.current.flush());
      if (strokeMirrorRef.current) renderROIMirror(strokeMirrorRef.current.flush());
    } else {
      if (!input.canvasPoint) return;
      const { x, y } = input.canvasPoint;
      const pressure = input.pressure || 0.5;
      const xtilt = (raw.tiltX || 0) / 60;
      const ytilt = (raw.tiltY || 0) / 60;

      strokePtsRef.current.push({ x, y });
      strokeRef.current.to(x, y, pressure, { dtime: totalDt, xtilt, ytilt });
      renderROI(strokeRef.current.flush());

      if (strokeMirrorRef.current) {
        const mp = reflectCanvasPoint(x, y);
        strokeMirrorRef.current.to(mp.x, mp.y, pressure, { dtime: totalDt, xtilt, ytilt });
        renderROIMirror(strokeMirrorRef.current.flush());
      }
    }
    onRedraw();
  });

  const onBrushUp = useMemoizedFn(() => {
    if (!strokeRef.current) return;
    renderROI(strokeRef.current.end());
    strokeRef.current = null;

    if (strokeMirrorRef.current) {
      renderROIMirror(strokeMirrorRef.current.end());
      strokeMirrorRef.current = null;
    }
    onRedraw();
  });

  const commitBrushStroke = useMemoizedFn(
    async (): Promise<{ buffer: ArrayBuffer; rect: Rect } | null> => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      if (moveCountRef.current < 2) {
        clearBrushCanvas();
        return null;
      }

      // 合并主 bounds 和镜像 bounds
      const b1 = strokeBoundsRef.current;
      const b2 = strokeBoundsMirrorRef.current;
      let merged = b1;
      if (b1 && b2) {
        const minX = Math.min(b1.x, b2.x);
        const minY = Math.min(b1.y, b2.y);
        const maxX = Math.max(b1.x + b1.width, b2.x + b2.width);
        const maxY = Math.max(b1.y + b1.height, b2.y + b2.height);
        merged = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      } else if (b2) {
        merged = b2;
      }
      if (!merged) return null;

      const padding = 4;
      const rect: Rect = {
        x: Math.max(0, Math.floor(merged.x - padding)),
        y: Math.max(0, Math.floor(merged.y - padding)),
        width: 0,
        height: 0,
      };
      rect.width = Math.min(
        canvas.width - rect.x,
        Math.ceil(merged.x + merged.width + padding) - rect.x
      );
      rect.height = Math.min(
        canvas.height - rect.y,
        Math.ceil(merged.y + merged.height + padding) - rect.y
      );
      if (rect.width <= 0 || rect.height <= 0) return null;

      const cropped = document.createElement('canvas');
      cropped.width = rect.width;
      cropped.height = rect.height;
      const ctx = cropped.getContext('2d')!;
      ctx.drawImage(canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

      // 叠加镜像 canvas
      const mc = canvasMirrorRef.current;
      if (mc && strokeBoundsMirrorRef.current) {
        ctx.drawImage(mc, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        cropped.toBlob(resolve, 'image/png')
      );
      if (!blob) return null;
      return { buffer: await blob.arrayBuffer(), rect };
    }
  );

  const clearBrushCanvas = useMemoizedFn(() => {
    const clear = (canvas: HTMLCanvasElement | null, surface: MyPaintSurface | null) => {
      if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      surface?.clear();
    };
    clear(canvasRef.current, surfaceRef.current);
    clear(canvasMirrorRef.current, surfaceMirrorRef.current);
    strokeBoundsRef.current = null;
    strokeBoundsMirrorRef.current = null;
  });

  const getStrokePoints = useMemoizedFn((): ShapePoint[] => strokePtsRef.current);

  const redrawWithShapePoints = useMemoizedFn((pts: ShapePoint[]): void => {
    const drawOn = (
      surface: MyPaintSurface,
      brush: MyPaintBrush,
      canvas: HTMLCanvasElement,
      points: ShapePoint[],
      boundsRef: React.MutableRefObject<Rect | null>
    ) => {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      surface.clear();
      boundsRef.current = null;

      const stroke = surface.bindBrush(brush);
      stroke.begin();
      const SPEED = 200;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const dtime =
          i === 0
            ? 0.001
            : Math.max(0.001, Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) / SPEED);
        stroke.to(p.x, p.y, 0.5, { dtime });
        const roi = stroke.flush();
        expandBounds(boundsRef, roi);
        const c = canvas.getContext('2d')!;
        surface.renderROIToCanvas(c, roi);
      }
      const roi = stroke.end();
      expandBounds(boundsRef, roi);
      surface.renderROIToCanvas(canvas.getContext('2d')!, roi);
    };

    if (!surfaceRef.current || !brushRef.current || !canvasRef.current) return;
    drawOn(surfaceRef.current, brushRef.current, canvasRef.current, pts, strokeBoundsRef);

    // 镜像：将 pts 中每个点关于对称轴反射
    const sym = getSymmetry();
    if (
      sym.active &&
      surfaceMirrorRef.current &&
      brushMirrorRef.current &&
      canvasMirrorRef.current
    ) {
      const mirrorPts = pts.map((p) => reflectCanvasPoint(p.x, p.y));
      drawOn(
        surfaceMirrorRef.current,
        brushMirrorRef.current,
        canvasMirrorRef.current,
        mirrorPts,
        strokeBoundsMirrorRef
      );
    }

    onRedraw();
  });

  return {
    canvasRef,
    mirrorCanvasRef: canvasMirrorRef,
    onBrushDown,
    onBrushMove,
    onBrushUp,
    commitBrushStroke,
    clearBrushCanvas,
    getStrokePoints,
    redrawWithShapePoints,
  };
}
