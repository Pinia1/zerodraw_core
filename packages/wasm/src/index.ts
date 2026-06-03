/**
 * mypaint.ts - libmypaint WASM TypeScript 封装库
 *
 * 将 libmypaint 的 C API 封装为类型安全的面向对象 JavaScript 接口，
 * 可直接用于 Canvas 2D 绑画或无 UI 的后端渲染。
 *
 * @example
 * ```ts
 * const mp = await MyPaint.create();
 * const surface = mp.createSurface(800, 600);
 * const brush = mp.createBrush();
 * brush.fromDefaults().setColor('#ff0000').set('radius_logarithmic', 3.0);
 *
 * const stroke = surface.bindBrush(brush);
 * stroke.begin();
 * stroke.to(100, 100, 0.5);
 * stroke.to(200, 150, 0.8, { dtime: 0.016 });
 * const roi = stroke.end();
 *
 * surface.renderToCanvas(ctx);
 * surface.renderROIToCanvas(ctx, roi);
 * ```
 *
 * @license ISC
 */

// ================================================================
// 类型定义
// ================================================================

/** Emscripten 模块接口 (简化) */
interface EmscriptenModule {
  cwrap(name: string, ret: string | null, args: string[]): (...a: any[]) => any;
  HEAPU8: Uint8Array;
  HEAPU16: Uint16Array;
  HEAP32: Int32Array;
  _malloc(size: number): number;
  _free(ptr: number): void;
}

/** Emscripten 工厂函数 */
declare function LibMyPaint(opts?: Record<string, any>): Promise<EmscriptenModule>;

/** 参数定义 */
export interface SettingInfo {
  readonly id: number;
  readonly min: number;
  readonly max: number;
  readonly def: number;
}

/** 输入源定义 */
export interface InputInfo {
  readonly id: number;
  readonly xmin: number;
  readonly xmax: number;
}

/** 脏区域矩形 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** HSV 颜色 */
export interface ColorHSV {
  h: number;
  s: number;
  v: number;
}

/** RGB 颜色 (0-1 范围) */
export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

/** 笔画选项 */
export interface StrokeOptions {
  /** 时间间隔(秒)，不传则自动计算 */
  dtime?: number;
  /** X 轴倾斜 (-1.5~1.5) */
  xtilt?: number;
  /** Y 轴倾斜 (-1.5~1.5) */
  ytilt?: number;
  /** 画布缩放级别 */
  viewzoom?: number;
  /** 画布旋转角度 */
  viewrotation?: number;
  /** 笔身旋转角度 */
  barrel_rotation?: number;
  /** 线性插值模式 */
  linear?: boolean;
}

/** .myb 画笔 JSON 格式 */
export interface BrushJSON {
  version: number;
  settings: Record<
    string,
    {
      base_value: number;
      inputs: Record<string, [number, number][]>;
    }
  >;
}

/** 引擎创建选项 */
export interface CreateOptions {
  /** 传递给 Emscripten 模块的选项 */
  wasmOpts?: Record<string, any>;
}

/** 带位置信息的 ImageData */
export interface PositionedImageData extends ImageData {
  _x: number;
  _y: number;
}

/** 颜色输入：十六进制字符串、HSV 或 RGB */
export type ColorInput = string | ColorHSV | ColorRGB;

/** 参数标识：名称或数字 id */
export type SettingRef = SettingName | number;

/** 输入源标识：名称或数字 id */
export type InputRef = InputName | number;

// ================================================================
// 参数名称联合类型
// ================================================================

export type SettingName =
  | 'opaque'
  | 'opaque_multiply'
  | 'opaque_linearize'
  | 'radius_logarithmic'
  | 'hardness'
  | 'softness'
  | 'anti_aliasing'
  | 'dabs_per_basic_radius'
  | 'dabs_per_actual_radius'
  | 'dabs_per_second'
  | 'gridmap_scale'
  | 'gridmap_scale_x'
  | 'gridmap_scale_y'
  | 'radius_by_random'
  | 'speed1_slowness'
  | 'speed2_slowness'
  | 'speed1_gamma'
  | 'speed2_gamma'
  | 'offset_by_random'
  | 'offset_y'
  | 'offset_x'
  | 'offset_angle'
  | 'offset_angle_asc'
  | 'offset_angle_view'
  | 'offset_angle_2'
  | 'offset_angle_2_asc'
  | 'offset_angle_2_view'
  | 'offset_angle_adj'
  | 'offset_multiplier'
  | 'offset_by_speed'
  | 'offset_by_speed_slowness'
  | 'slow_tracking'
  | 'slow_tracking_per_dab'
  | 'tracking_noise'
  | 'color_h'
  | 'color_s'
  | 'color_v'
  | 'restore_color'
  | 'change_color_h'
  | 'change_color_l'
  | 'change_color_hsl_s'
  | 'change_color_v'
  | 'change_color_hsv_s'
  | 'smudge'
  | 'paint_mode'
  | 'smudge_transparency'
  | 'smudge_length'
  | 'smudge_length_log'
  | 'smudge_bucket'
  | 'smudge_radius_log'
  | 'eraser'
  | 'stroke_threshold'
  | 'stroke_duration_logarithmic'
  | 'stroke_holdtime'
  | 'custom_input'
  | 'custom_input_slowness'
  | 'elliptical_dab_ratio'
  | 'elliptical_dab_angle'
  | 'direction_filter'
  | 'lock_alpha'
  | 'colorize'
  | 'posterize'
  | 'posterize_num'
  | 'snap_to_pixel'
  | 'pressure_gain_log';

export type InputName =
  | 'pressure'
  | 'random'
  | 'stroke'
  | 'direction'
  | 'tilt_declination'
  | 'tilt_ascension'
  | 'speed1'
  | 'speed2'
  | 'custom'
  | 'direction_angle'
  | 'attack_angle'
  | 'tilt_declinationx'
  | 'tilt_declinationy'
  | 'gridmap_x'
  | 'gridmap_y'
  | 'viewzoom'
  | 'brush_radius'
  | 'barrel_rotation';

// ================================================================
// C 函数接口包装
// ================================================================

interface CBindings {
  init(): void;
  brush_new(): number;
  brush_unref(ptr: number): void;
  brush_from_defaults(ptr: number): void;
  brush_reset(ptr: number): void;
  brush_set_base(ptr: number, setting: number, value: number): void;
  brush_get_base(ptr: number, setting: number): number;
  brush_new_stroke(ptr: number): void;
  brush_from_string(ptr: number, strPtr: number): number;
  brush_set_mapping_n(ptr: number, setting: number, input: number, n: number): void;
  brush_set_mapping_point(
    ptr: number,
    setting: number,
    input: number,
    idx: number,
    x: number,
    y: number
  ): void;
  stroke_to(
    brush: number,
    surface: number,
    x: number,
    y: number,
    pressure: number,
    xtilt: number,
    ytilt: number,
    dtime: number,
    viewzoom: number,
    viewrotation: number,
    barrel_rotation: number,
    linear: number
  ): number;
  surface_new(w: number, h: number): number;
  surface_iface(ptr: number): number;
  begin_atomic(ptr: number): void;
  end_atomic_roi(surface: number, ox: number, oy: number, ow: number, oh: number): void;
  to_rgba8(surface: number, buf: number): void;
  to_rgba8_roi(surface: number, buf: number, x: number, y: number, w: number, h: number): void;
  clear_surface(ptr: number): void;
  alloc_string(len: number): number;
  free_string(ptr: number): void;
}

// ================================================================
// 常量
// ================================================================

/** 全部 65 个笔刷参数定义 */
export const SETTINGS: Readonly<Record<SettingName, SettingInfo>> = {
  opaque: { id: 0, min: 0, max: 2, def: 1.0 },
  opaque_multiply: { id: 1, min: 0, max: 2, def: 0.0 },
  opaque_linearize: { id: 2, min: 0, max: 2, def: 0.9 },
  radius_logarithmic: { id: 3, min: -2, max: 6, def: 2.0 },
  hardness: { id: 4, min: 0, max: 1, def: 0.8 },
  softness: { id: 5, min: 0, max: 1, def: 0.0 },
  anti_aliasing: { id: 6, min: 0, max: 5, def: 1.0 },
  dabs_per_basic_radius: { id: 7, min: 0, max: 200, def: 0.0 },
  dabs_per_actual_radius: { id: 8, min: 0, max: 200, def: 2.0 },
  dabs_per_second: { id: 9, min: 0, max: 200, def: 0.0 },
  gridmap_scale: { id: 10, min: -10, max: 10, def: 0.0 },
  gridmap_scale_x: { id: 11, min: 0, max: 10, def: 1.0 },
  gridmap_scale_y: { id: 12, min: 0, max: 10, def: 1.0 },
  radius_by_random: { id: 13, min: 0, max: 1.5, def: 0.0 },
  speed1_slowness: { id: 14, min: 0, max: 0.2, def: 0.04 },
  speed2_slowness: { id: 15, min: 0, max: 3, def: 0.8 },
  speed1_gamma: { id: 16, min: -8, max: 8, def: 4.0 },
  speed2_gamma: { id: 17, min: -8, max: 8, def: 4.0 },
  offset_by_random: { id: 18, min: 0, max: 25, def: 0.0 },
  offset_y: { id: 19, min: -40, max: 40, def: 0.0 },
  offset_x: { id: 20, min: -40, max: 40, def: 0.0 },
  offset_angle: { id: 21, min: -40, max: 40, def: 0.0 },
  offset_angle_asc: { id: 22, min: -40, max: 40, def: 0.0 },
  offset_angle_view: { id: 23, min: -40, max: 40, def: 0.0 },
  offset_angle_2: { id: 24, min: 0, max: 40, def: 0.0 },
  offset_angle_2_asc: { id: 25, min: 0, max: 40, def: 0.0 },
  offset_angle_2_view: { id: 26, min: 0, max: 40, def: 0.0 },
  offset_angle_adj: { id: 27, min: -180, max: 180, def: 0.0 },
  offset_multiplier: { id: 28, min: -2, max: 3, def: 0.0 },
  offset_by_speed: { id: 29, min: -3, max: 3, def: 0.0 },
  offset_by_speed_slowness: { id: 30, min: 0, max: 15, def: 1.0 },
  slow_tracking: { id: 31, min: 0, max: 10, def: 0.0 },
  slow_tracking_per_dab: { id: 32, min: 0, max: 10, def: 0.0 },
  tracking_noise: { id: 33, min: 0, max: 12, def: 0.0 },
  color_h: { id: 34, min: 0, max: 1, def: 0.0 },
  color_s: { id: 35, min: -0.5, max: 1.5, def: 0.0 },
  color_v: { id: 36, min: -0.5, max: 1.5, def: 0.0 },
  restore_color: { id: 37, min: 0, max: 1, def: 0.0 },
  change_color_h: { id: 38, min: -2, max: 2, def: 0.0 },
  change_color_l: { id: 39, min: -2, max: 2, def: 0.0 },
  change_color_hsl_s: { id: 40, min: -2, max: 2, def: 0.0 },
  change_color_v: { id: 41, min: -2, max: 2, def: 0.0 },
  change_color_hsv_s: { id: 42, min: -2, max: 2, def: 0.0 },
  smudge: { id: 43, min: 0, max: 1, def: 0.0 },
  paint_mode: { id: 44, min: 0, max: 1, def: 1.0 },
  smudge_transparency: { id: 45, min: -1, max: 1, def: 0.0 },
  smudge_length: { id: 46, min: 0, max: 1, def: 0.5 },
  smudge_length_log: { id: 47, min: 0, max: 20, def: 0.0 },
  smudge_bucket: { id: 48, min: 0, max: 255, def: 0.0 },
  smudge_radius_log: { id: 49, min: -1.6, max: 1.6, def: 0.0 },
  eraser: { id: 50, min: 0, max: 1, def: 0.0 },
  stroke_threshold: { id: 51, min: 0, max: 0.5, def: 0.0 },
  stroke_duration_logarithmic: { id: 52, min: -1, max: 14, def: 4.0 },
  stroke_holdtime: { id: 53, min: 0, max: 10, def: 0.0 },
  custom_input: { id: 54, min: -5, max: 5, def: 0.0 },
  custom_input_slowness: { id: 55, min: 0, max: 10, def: 0.0 },
  elliptical_dab_ratio: { id: 56, min: 1, max: 10, def: 1.0 },
  elliptical_dab_angle: { id: 57, min: 0, max: 180, def: 90 },
  direction_filter: { id: 58, min: 0, max: 10, def: 2.0 },
  lock_alpha: { id: 59, min: 0, max: 1, def: 0.0 },
  colorize: { id: 60, min: 0, max: 1, def: 0.0 },
  posterize: { id: 61, min: 0, max: 1, def: 0.0 },
  posterize_num: { id: 62, min: 0.01, max: 1.28, def: 0.05 },
  snap_to_pixel: { id: 63, min: 0, max: 1, def: 0.0 },
  pressure_gain_log: { id: 64, min: -1.8, max: 1.8, def: 0.0 },
} as const;

/** 全部 18 个输入源定义 */
export const INPUTS: Readonly<Record<InputName, InputInfo>> = {
  pressure: { id: 0, xmin: 0, xmax: 1 },
  random: { id: 1, xmin: 0, xmax: 1 },
  stroke: { id: 2, xmin: 0, xmax: 1 },
  direction: { id: 3, xmin: 0, xmax: 180 },
  tilt_declination: { id: 4, xmin: 0, xmax: 90 },
  tilt_ascension: { id: 5, xmin: -180, xmax: 180 },
  speed1: { id: 6, xmin: 0, xmax: 4 },
  speed2: { id: 7, xmin: 0, xmax: 4 },
  custom: { id: 8, xmin: -10, xmax: 10 },
  direction_angle: { id: 9, xmin: 0, xmax: 360 },
  attack_angle: { id: 10, xmin: -180, xmax: 180 },
  tilt_declinationx: { id: 11, xmin: -90, xmax: 90 },
  tilt_declinationy: { id: 12, xmin: -90, xmax: 90 },
  gridmap_x: { id: 13, xmin: 0, xmax: 256 },
  gridmap_y: { id: 14, xmin: 0, xmax: 256 },
  viewzoom: { id: 15, xmin: -2.77, xmax: 4.15 },
  brush_radius: { id: 16, xmin: -2, xmax: 6 },
  barrel_rotation: { id: 17, xmin: -180, xmax: 180 },
} as const;

// ================================================================
// 工具函数
// ================================================================

function resolveSettingId(ref: SettingRef): number {
  if (typeof ref === 'number') return ref;
  const s = SETTINGS[ref];
  if (!s) throw new Error(`Unknown setting: "${ref}"`);
  return s.id;
}

function resolveInputId(ref: InputRef): number {
  if (typeof ref === 'number') return ref;
  const s = INPUTS[ref];
  if (!s) throw new Error(`Unknown input: "${ref}"`);
  return s.id;
}

/** 十六进制颜色转 HSV */
export function hexToHsv(hex: string): ColorHSV {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    d = mx - mn;
  const v = mx,
    s = mx === 0 ? 0 : d / mx;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (mx === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h, s, v };
}

/** RGB(0-1) 转 HSV */
export function rgbToHsv(r: number, g: number, b: number): ColorHSV {
  return hexToHsv(
    '#' +
      Math.round(r * 255)
        .toString(16)
        .padStart(2, '0') +
      Math.round(g * 255)
        .toString(16)
        .padStart(2, '0') +
      Math.round(b * 255)
        .toString(16)
        .padStart(2, '0')
  );
}

// ================================================================
// MyPaintBrush
// ================================================================

export class MyPaintBrush {
  /** @internal */ _engine: MyPaintEngine;
  /** @internal */ _ptr: number;

  /** @internal */
  constructor(engine: MyPaintEngine, ptr: number) {
    this._engine = engine;
    this._ptr = ptr;
  }

  /** 重置为默认参数 */
  fromDefaults(): this {
    this._engine._C.brush_from_defaults(this._ptr);
    return this;
  }

  /** 从 .myb JSON 字符串加载 */
  fromString(jsonStr: string): boolean {
    const enc = new TextEncoder();
    const bytes = enc.encode(jsonStr);
    const M = this._engine._M;
    const ptr = this._engine._C.alloc_string(bytes.length);
    M.HEAPU8.set(bytes, ptr);
    M.HEAPU8[ptr + bytes.length] = 0;
    const ok = this._engine._C.brush_from_string(this._ptr, ptr);
    this._engine._C.free_string(ptr);
    return !!ok;
  }

  /** 从 .myb JSON 对象加载 */
  fromJSON(obj: BrushJSON): boolean {
    return this.fromString(JSON.stringify(obj));
  }

  /** 设置笔刷参数基础值 */
  set(setting: SettingRef, value: number): this {
    this._engine._C.brush_set_base(this._ptr, resolveSettingId(setting), value);
    return this;
  }

  /** 获取笔刷参数基础值 */
  get(setting: SettingRef): number {
    return this._engine._C.brush_get_base(this._ptr, resolveSettingId(setting));
  }

  /** 设置颜色 (支持 '#rrggbb' / { h, s, v } / { r, g, b }) */
  setColor(color: ColorInput): this {
    let hsv: ColorHSV;
    if (typeof color === 'string') {
      hsv = hexToHsv(color);
    } else if ('h' in color && 's' in color && 'v' in color) {
      hsv = color;
    } else if ('r' in color && 'g' in color && 'b' in color) {
      hsv = rgbToHsv(color.r, color.g, color.b);
    } else {
      throw new Error('Invalid color format');
    }
    this.set('color_h', hsv.h);
    this.set('color_s', hsv.s);
    this.set('color_v', hsv.v);
    return this;
  }

  /** 获取当前颜色 (HSV) */
  getColor(): ColorHSV {
    return {
      h: this.get('color_h'),
      s: this.get('color_s'),
      v: this.get('color_v'),
    };
  }

  /** 设置输入映射曲线，空数组清除映射 */
  setMapping(setting: SettingRef, input: InputRef, points: [number, number][]): this {
    const sid = resolveSettingId(setting);
    const iid = resolveInputId(input);
    const C = this._engine._C;
    if (!points || points.length === 0) {
      C.brush_set_mapping_n(this._ptr, sid, iid, 0);
    } else {
      const sorted = [...points].sort((a, b) => a[0] - b[0]);
      C.brush_set_mapping_n(this._ptr, sid, iid, sorted.length);
      for (let i = 0; i < sorted.length; i++) {
        C.brush_set_mapping_point(this._ptr, sid, iid, i, sorted[i][0], sorted[i][1]);
      }
    }
    return this;
  }

  /** 重置笔刷内部状态 */
  reset(): this {
    this._engine._C.brush_reset(this._ptr);
    return this;
  }

  /** 导出为 .myb JSON 对象 */
  toJSON(): BrushJSON {
    const out: BrushJSON = { version: 3, settings: {} };
    for (const [cname] of Object.entries(SETTINGS)) {
      out.settings[cname] = {
        base_value: +this.get(cname as SettingName).toFixed(4),
        inputs: {},
      };
    }
    return out;
  }

  /** 释放资源 */
  destroy(): void {
    if (this._ptr) {
      this._engine._C.brush_unref(this._ptr);
      this._ptr = 0;
    }
  }
}

// ================================================================
// MyPaintStroke
// ================================================================

export class MyPaintStroke {
  /** @internal */ private _surface: MyPaintSurface;
  /** @internal */ private _brush: MyPaintBrush;
  /** @internal */ private _engine: MyPaintEngine;
  /** @internal */ private _active = false;
  /** @internal */ private _lastTime = 0;
  /** @internal */ private _needsPositionReset = false;

  /** @internal */
  constructor(surface: MyPaintSurface, brush: MyPaintBrush) {
    this._surface = surface;
    this._brush = brush;
    this._engine = surface._engine;
  }

  /** 开始笔画 */
  begin(): this {
    const C = this._engine._C;
    C.brush_reset(this._brush._ptr);
    C.brush_new_stroke(this._brush._ptr);
    C.begin_atomic(this._surface._surfacePtr);
    this._active = true;
    this._needsPositionReset = true;
    this._lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return this;
  }

  /** 绘制到指定位置 */
  to(x: number, y: number, pressure?: number, opts?: StrokeOptions): this {
    if (!this._active) this.begin();
    pressure = pressure ?? 0.5;
    const o = opts || {};

    // 首次调用：先用 pressure=0 + 大 dtime 让引擎跳到新落笔位置（不绘制任何内容）
    // 这避免了新笔画从上一笔的最后位置拉线过来
    if (this._needsPositionReset) {
      this._needsPositionReset = false;
      this._engine._C.stroke_to(
        this._brush._ptr,
        this._surface._surfacePtr,
        x,
        y,
        0,
        o.xtilt ?? 0,
        o.ytilt ?? 0,
        10.0, // 大 dtime 确保触发 libmypaint 内部的 reset 逻辑
        o.viewzoom ?? 1.0,
        o.viewrotation ?? 0,
        o.barrel_rotation ?? 0,
        0
      );
    }

    let dtime = o.dtime;
    if (dtime === undefined) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      dtime = Math.max((now - this._lastTime) / 1000, 0.0005);
      this._lastTime = now;
    }

    this._engine._C.stroke_to(
      this._brush._ptr,
      this._surface._surfacePtr,
      x,
      y,
      pressure,
      o.xtilt ?? 0,
      o.ytilt ?? 0,
      dtime,
      o.viewzoom ?? 1.0,
      o.viewrotation ?? 0,
      o.barrel_rotation ?? 0,
      o.linear ? 1 : 0
    );
    return this;
  }

  /** 结束笔画，返回脏区域 */
  end(): Rect | null {
    if (!this._active) return null;
    this._active = false;
    return this._surface._endAtomicROI();
  }

  /** 刷新当前帧（不结束笔画），返回脏区域 */
  flush(): Rect | null {
    if (!this._active) return null;
    const roi = this._surface._endAtomicROI();
    this._engine._C.begin_atomic(this._surface._surfacePtr);
    return roi;
  }
}

// ================================================================
// MyPaintSurface
// ================================================================

export class MyPaintSurface {
  /** @internal */ _engine: MyPaintEngine;
  /** @internal */ _fixedPtr: number;
  /** @internal */ _surfacePtr: number;

  readonly width: number;
  readonly height: number;

  /** @internal */ private _fullBufSize: number;
  /** @internal */ private _fullBufPtr: number;
  /** @internal */ private _roiBufPtr: number;
  /** @internal */ private _roiOutPtr: number;

  /** @internal */
  constructor(engine: MyPaintEngine, width: number, height: number) {
    this._engine = engine;
    this.width = width;
    this.height = height;

    const C = engine._C;
    this._fixedPtr = C.surface_new(width, height);
    this._surfacePtr = C.surface_iface(this._fixedPtr);

    this._fullBufSize = width * height * 4;
    this._fullBufPtr = engine._M._malloc(this._fullBufSize);
    this._roiBufPtr = engine._M._malloc(this._fullBufSize);
    this._roiOutPtr = engine._M._malloc(16);
  }

  /** 创建与此画布关联的笔画会话 */
  bindBrush(brush: MyPaintBrush): MyPaintStroke {
    return new MyPaintStroke(this, brush);
  }

  /** 清空画布（恢复为白色） */
  clear(): this {
    this._engine._C.clear_surface(this._fixedPtr);
    return this;
  }

  /** 获取整个画布的 ImageData */
  getImageData(): ImageData {
    const C = this._engine._C;
    const M = this._engine._M;
    C.to_rgba8(this._fixedPtr, this._fullBufPtr);
    const src = new Uint8Array(M.HEAPU8.buffer, this._fullBufPtr, this._fullBufSize);
    const pixels = new Uint8ClampedArray(this._fullBufSize);
    pixels.set(src);
    return new ImageData(pixels, this.width, this.height);
  }

  /** 获取指定区域的 ImageData（附加 _x, _y 位置信息） */
  getImageDataROI(roi: Rect): PositionedImageData | null {
    if (!roi || roi.width <= 0 || roi.height <= 0) return null;

    let { x, y, width: rw, height: rh } = roi;
    if (x < 0) {
      rw += x;
      x = 0;
    }
    if (y < 0) {
      rh += y;
      y = 0;
    }
    if (x + rw > this.width) rw = this.width - x;
    if (y + rh > this.height) rh = this.height - y;
    if (rw <= 0 || rh <= 0) return null;

    const C = this._engine._C;
    const M = this._engine._M;
    const sz = rw * rh * 4;
    C.to_rgba8_roi(this._fixedPtr, this._roiBufPtr, x, y, rw, rh);
    const src = new Uint8Array(M.HEAPU8.buffer, this._roiBufPtr, sz);
    const pixels = new Uint8ClampedArray(sz);
    pixels.set(src);
    const imgData = new ImageData(pixels, rw, rh) as PositionedImageData;
    imgData._x = x;
    imgData._y = y;
    return imgData;
  }

  /** 渲染整个画布到 Canvas 2D context */
  renderToCanvas(ctx: CanvasRenderingContext2D): void {
    ctx.putImageData(this.getImageData(), 0, 0);
  }

  /** 渲染脏区域到 Canvas 2D context */
  renderROIToCanvas(ctx: CanvasRenderingContext2D, roi: Rect | null, padding = 4): void {
    if (!roi || roi.width <= 0 || roi.height <= 0) return;
    const expanded: Rect = {
      x: roi.x - padding,
      y: roi.y - padding,
      width: roi.width + padding * 2,
      height: roi.height + padding * 2,
    };
    const imgData = this.getImageDataROI(expanded);
    if (imgData) {
      ctx.putImageData(imgData, imgData._x, imgData._y);
    }
  }

  /** @internal */
  _endAtomicROI(): Rect | null {
    const C = this._engine._C;
    const M = this._engine._M;
    const p = this._roiOutPtr;
    C.end_atomic_roi(this._surfacePtr, p, p + 4, p + 8, p + 12);
    const x = M.HEAP32[p >> 2];
    const y = M.HEAP32[(p >> 2) + 1];
    const w = M.HEAP32[(p >> 2) + 2];
    const h = M.HEAP32[(p >> 2) + 3];
    if (w <= 0 || h <= 0) return null;
    return { x, y, width: w, height: h };
  }

  /** 释放资源 */
  destroy(): void {
    const M = this._engine._M;
    if (this._fullBufPtr) {
      M._free(this._fullBufPtr);
      this._fullBufPtr = 0;
    }
    if (this._roiBufPtr) {
      M._free(this._roiBufPtr);
      this._roiBufPtr = 0;
    }
    if (this._roiOutPtr) {
      M._free(this._roiOutPtr);
      this._roiOutPtr = 0;
    }
  }
}

// ================================================================
// MyPaintEngine
// ================================================================

export class MyPaintEngine {
  /** @internal */ _M: EmscriptenModule;
  /** @internal */ _C: CBindings;

  /** @internal */
  constructor(wasmModule: EmscriptenModule) {
    this._M = wasmModule;
    this._C = {
      init: wasmModule.cwrap('mypaint_init', null, []),
      brush_new: wasmModule.cwrap('mypaint_brush_new', 'number', []),
      brush_unref: wasmModule.cwrap('mypaint_brush_unref', null, ['number']),
      brush_from_defaults: wasmModule.cwrap('mypaint_brush_from_defaults', null, ['number']),
      brush_reset: wasmModule.cwrap('mypaint_brush_reset', null, ['number']),
      brush_set_base: wasmModule.cwrap('mypaint_brush_set_base_value', null, [
        'number',
        'number',
        'number',
      ]),
      brush_get_base: wasmModule.cwrap('mypaint_brush_get_base_value', 'number', [
        'number',
        'number',
      ]),
      brush_new_stroke: wasmModule.cwrap('mypaint_brush_new_stroke', null, ['number']),
      brush_from_string: wasmModule.cwrap('mypaint_brush_from_string', 'number', [
        'number',
        'number',
      ]),
      brush_set_mapping_n: wasmModule.cwrap('mypaint_brush_set_mapping_n', null, [
        'number',
        'number',
        'number',
        'number',
      ]),
      brush_set_mapping_point: wasmModule.cwrap('mypaint_brush_set_mapping_point', null, [
        'number',
        'number',
        'number',
        'number',
        'number',
        'number',
      ]),
      stroke_to: wasmModule.cwrap('mypaint_brush_stroke_to', 'number', [
        'number',
        'number',
        'number',
        'number',
        'number',
        'number',
        'number',
        'number',
        'number',
        'number',
        'number',
        'number',
      ]),
      surface_new: wasmModule.cwrap('mypaint_fixed_tiled_surface_new', 'number', [
        'number',
        'number',
      ]),
      surface_iface: wasmModule.cwrap('mypaint_fixed_tiled_surface_interface', 'number', [
        'number',
      ]),
      begin_atomic: wasmModule.cwrap('mypaint_surface_begin_atomic', null, ['number']),
      end_atomic_roi: wasmModule.cwrap('wasm_end_atomic_get_roi', null, [
        'number',
        'number',
        'number',
        'number',
        'number',
      ]),
      to_rgba8: wasmModule.cwrap('wasm_surface_to_rgba8', null, ['number', 'number']),
      to_rgba8_roi: wasmModule.cwrap('wasm_surface_to_rgba8_roi', null, [
        'number',
        'number',
        'number',
        'number',
        'number',
        'number',
      ]),
      clear_surface: wasmModule.cwrap('wasm_surface_clear', null, ['number']),
      alloc_string: wasmModule.cwrap('wasm_alloc_string', 'number', ['number']),
      free_string: wasmModule.cwrap('wasm_free_string', null, ['number']),
    } as CBindings;
    this._C.init();
  }

  /** 创建画布 */
  createSurface(width: number, height: number): MyPaintSurface {
    return new MyPaintSurface(this, width, height);
  }

  /** 创建笔刷 */
  createBrush(): MyPaintBrush {
    const ptr = this._C.brush_new();
    return new MyPaintBrush(this, ptr);
  }
}

// ================================================================
// 公共 API
// ================================================================

const MyPaint = {
  /**
   * 创建引擎实例（异步，需加载 WASM）
   * 需在加载 libmypaint.js 之后调用
   */
  async create(opts?: CreateOptions): Promise<MyPaintEngine> {
    if (typeof LibMyPaint === 'undefined') {
      throw new Error('LibMyPaint WASM module not loaded. Include libmypaint.js before mypaint.js');
    }
    const wasmModule = await LibMyPaint(opts?.wasmOpts || {});
    return new MyPaintEngine(wasmModule);
  },

  /** 笔刷参数定义 */
  SETTINGS,
  /** 输入源定义 */
  INPUTS,

  /** 工具函数 */
  utils: { hexToHsv, rgbToHsv },

  /** 类引用 */
  Engine: MyPaintEngine,
  Brush: MyPaintBrush,
  Surface: MyPaintSurface,
  Stroke: MyPaintStroke,
};

export default MyPaint;

// UMD 兼容
if (typeof globalThis !== 'undefined') {
  (globalThis as any).MyPaint = MyPaint;
}
