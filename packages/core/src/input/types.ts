import type Konva from 'konva';
import type { Vector2d } from 'konva/lib/types';

export type PointerSource = 'mouse' | 'pen' | 'touch' | 'unknown';
export type NormalizedPointerPhase = 'down' | 'move' | 'up' | 'cancel';

export interface NormalizedPointerEvent {
  /** 原始 Konva 事件（需要访问 stage、target、evt 时用） */
  konvaEvent: Konva.KonvaEventObject<MouseEvent>;
  /** down/move/up/cancel */
  phase: NormalizedPointerPhase;

  /** PointerEvent.pointerId；在 MouseEvent 场景下可能为 undefined */
  pointerId?: number;
  /** mouse/pen/touch/unknown */
  pointerType: PointerSource;
  /** 0~1；mouse 一般为 0 或 0.5；pen/touch 可能有真实值 */
  pressure: number;

  /** 事件发生时的 stage 坐标（与现有 getRelativePointerPosition 一致的坐标系） */
  stagePoint: Vector2d | null;
  /** 事件发生时的画布内坐标（stagePoint - layerConfig.x/y） */
  canvasPoint: Vector2d | null;

  /** 鼠标主键/触控主指针 */
  isPrimary: boolean;
  /** 当前是否按下主按钮（mouse: 左键） */
  isPrimaryButton: boolean;

  /** 原生事件按钮字段（可能无） */
  button?: number;
  buttons?: number;

  /** 时间戳（如有） */
  timeStamp?: number;

  /** 修饰键：便于工具逻辑（例如 Shift 锁比例） */
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}
