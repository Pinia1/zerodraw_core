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
import MyPaint, { hexToHsv } from '@zeroDraw/wasm';
import { useEffect, useRef } from 'react';
import type { NormalizedPointerEvent } from '../input/types';
import type { LayerConfigTypes, StageConfigTypes } from '../types/Drawing';

const IMPRESSIONIST_BRUSH: BrushJSON = {
  version: 3,
  settings: {
    anti_aliasing: { base_value: 0.66, inputs: {} },
    change_color_h: {
      base_value: 0.0,
      inputs: {
        custom: [
          [-2.0, -0.04],
          [2.0, 0.04],
        ],
      },
    },
    change_color_hsl_s: { base_value: 0.0, inputs: {} },
    change_color_hsv_s: { base_value: 0.0, inputs: {} },
    change_color_l: {
      base_value: 0.0,
      inputs: {
        stroke: [
          [0.0, 0.0],
          [0.87963, 0.02],
          [1.0, 0.0],
        ],
      },
    },
    change_color_v: { base_value: 0.0, inputs: {} },
    color_h: { base_value: 0.0, inputs: {} },
    color_s: { base_value: 0.0, inputs: {} },
    color_v: { base_value: 0.0, inputs: {} },
    colorize: { base_value: 0.0, inputs: {} },
    custom_input: {
      base_value: 0.0,
      inputs: {
        random: [
          [0.0, -10.0],
          [1.0, 10.0],
        ],
      },
    },
    custom_input_slowness: {
      base_value: 0.0,
      inputs: {
        tilt_declination: [
          [0.0, 4.41],
          [90.0, 0.0],
        ],
      },
    },
    dabs_per_actual_radius: { base_value: 6.0, inputs: {} },
    dabs_per_basic_radius: { base_value: 6.0, inputs: {} },
    dabs_per_second: { base_value: 80.0, inputs: {} },
    direction_filter: { base_value: 2.0, inputs: {} },
    elliptical_dab_angle: {
      base_value: 0.0,
      inputs: {
        direction: [
          [0.0, 0.0],
          [180.0, 180.0],
        ],
      },
    },
    elliptical_dab_ratio: {
      base_value: 7.1,
      inputs: {
        speed1: [
          [0.0, -0.668571],
          [4.0, 4.68],
        ],
        stroke: [
          [0.0, -0.4],
          [1.0, 0.4],
        ],
        tilt_declination: [
          [0.0, 3.636875],
          [90.0, -7.59],
        ],
      },
    },
    eraser: { base_value: 0.0, inputs: {} },
    hardness: { base_value: 0.8, inputs: {} },
    lock_alpha: { base_value: 0.0, inputs: {} },
    offset_by_random: {
      base_value: 0.6,
      inputs: {
        tilt_declination: [
          [0.0, 0.0],
          [45.0, 0.0],
          [90.0, 0.63],
        ],
      },
    },
    offset_by_speed: { base_value: 0.0, inputs: {} },
    offset_by_speed_slowness: { base_value: 1.0, inputs: {} },
    opaque: {
      base_value: 1.0,
      inputs: {
        pressure: [
          [0.0, 0.0],
          [0.166667, 0.75],
          [1.0, 1.0],
        ],
      },
    },
    opaque_linearize: { base_value: 0.9, inputs: {} },
    opaque_multiply: {
      base_value: 0.0,
      inputs: {
        pressure: [
          [0.0, 0.0],
          [0.067901, 0.78125],
          [0.185185, 1.0],
          [1.0, 1.0],
        ],
      },
    },
    radius_by_random: { base_value: 0.0, inputs: {} },
    radius_logarithmic: {
      base_value: 2.0,
      inputs: {
        pressure: [
          [0.0, -2.0],
          [0.401235, 0.0],
          [1.0, 0.0],
        ],
        tilt_declination: [
          [0.0, 0.0],
          [45.0, 0.0],
          [90.0, -1.6],
        ],
      },
    },
    restore_color: { base_value: 0.0, inputs: {} },
    slow_tracking: { base_value: 0.0, inputs: {} },
    slow_tracking_per_dab: { base_value: 0.0, inputs: {} },
    smudge: { base_value: 0.0, inputs: {} },
    smudge_length: { base_value: 0.5, inputs: {} },
    smudge_radius_log: { base_value: 0.0, inputs: {} },
    speed1_gamma: { base_value: 4.0, inputs: {} },
    speed1_slowness: { base_value: 0.04, inputs: {} },
    speed2_gamma: { base_value: 4.0, inputs: {} },
    speed2_slowness: { base_value: 0.8, inputs: {} },
    stroke_duration_logarithmic: { base_value: 6.0, inputs: {} },
    stroke_holdtime: { base_value: 10.0, inputs: {} },
    stroke_threshold: { base_value: 0.0, inputs: {} },
    tracking_noise: { base_value: 0.2, inputs: {} },
  },
};

export interface UseBrushToolReturn {
  /** 当前笔刷渲染的离屏 canvas（交给 DrawLayer 显示） */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onBrushDown: (input: NormalizedPointerEvent) => void;
  onBrushMove: (input: NormalizedPointerEvent) => void;
  onBrushUp: () => void;
  /** 将当前画布快照导出为 PNG ArrayBuffer（不清空画布） */
  commitBrushStroke: () => Promise<ArrayBuffer | null>;
  /** 清空离屏 canvas 和 WASM surface，为下一笔做准备 */
  clearBrushCanvas: () => void;
  /** 获取本次笔画在画布坐标系内收集的点序列（用于图形识别） */
  getStrokePoints: () => ShapePoint[];
  /** 清空画布并用给定点序列重绘（图形识别矫正后调用） */
  redrawWithShapePoints: (pts: ShapePoint[]) => void;
}

export function useBrushTool(
  layerConfig: LayerConfigTypes,
  stageConfig: StageConfigTypes,
  fillColor: string,
  strokeWidth: number,
  opacity: number,
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
  const strokePtsRef = useRef<ShapePoint[]>([]);
  const layerCfgRef  = useRef(layerConfig);
  const stageCfgRef = useRef(stageConfig);
  layerCfgRef.current = layerConfig;
  stageCfgRef.current = stageConfig;

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
  strokeWidthRef.current = strokeWidth;
  opacityRef.current = opacity;

  /** 确保笔刷存在，并同步颜色、粗细、透明度 */
  const ensureBrush = useMemoizedFn((color: string): boolean => {
    if (!engineRef.current) return false;
    if (!brushRef.current) {
      brushRef.current = engineRef.current.createBrush();
      brushRef.current.fromJSON(IMPRESSIONIST_BRUSH);
    }
    const hsv = hexToHsv(color);
    // strokeWidth 是直径像素，libmypaint radius_logarithmic = ln(radius) = ln(strokeWidth/2)
    const radiusLog = Math.log(Math.max(1, strokeWidthRef.current / 2));
    const radius = Math.exp(radiusLog);
    // 保证短轴 ≥ 1px：elliptical_dab_ratio = min(7.1, radius / 1px)
    const ellipRatio = Math.min(7.1, Math.max(1, radius));
    // opacity 0-1 → opaque 0-2（印象派 base 为 1.0，这里直接用用户值覆盖）
    const opaque = Math.min(2, Math.max(0, opacityRef.current * 2));
    brushRef.current
      .set('color_h', hsv.h)
      .set('color_s', hsv.s)
      .set('color_v', hsv.v)
      .set('radius_logarithmic', radiusLog)
      .set('elliptical_dab_ratio', ellipRatio)
      .set('opaque', opaque);
    return true;
  });

  /** 将脏区域渲染到离屏 canvas */
  const renderROI = useMemoizedFn((roi: Rect | null) => {
    const surface = surfaceRef.current;
    const canvas = canvasRef.current;
    if (!surface || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    surface.renderROIToCanvas(ctx, roi);
  });

  /** 将 coalesced PointerEvent 的 clientX/Y 转为画布坐标 */
  const clientToCanvas = useMemoizedFn(
    (clientX: number, clientY: number, stageEl: HTMLDivElement) => {
      const { scale, x: sx, y: sy } = stageCfgRef.current;
      const { x: lx, y: ly } = layerCfgRef.current;
      const rect = stageEl.getBoundingClientRect();
      const stageX = (clientX - rect.left - sx) / scale;
      const stageY = (clientY - rect.top - sy) / scale;
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
      const stageEl = stage.container();
      const dtPer = totalDt / coalesced.length;
      for (const ce of coalesced) {
        const pt = clientToCanvas(ce.clientX, ce.clientY, stageEl);
        strokePtsRef.current.push(pt);
        const xtilt = (ce.tiltX || 0) / 60;
        const ytilt = (ce.tiltY || 0) / 60;
        strokeRef.current.to(pt.x, pt.y, ce.pressure || input.pressure || 0.5, {
          dtime: dtPer,
          xtilt,
          ytilt,
        });
        renderROI(strokeRef.current.flush());
      }
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

  const commitBrushStroke = useMemoizedFn(async (): Promise<ArrayBuffer | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    // 移动次数不足时视为误触，清空画布但不写入历史
    if (moveCountRef.current < 2) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      surfaceRef.current?.clear();
      return null;
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return null;
    return blob.arrayBuffer();
  });

  const clearBrushCanvas = useMemoizedFn(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    surfaceRef.current?.clear();
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
