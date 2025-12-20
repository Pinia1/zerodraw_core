import type Konva from 'konva';
import type { Vector2d } from 'konva/lib/types';
import type { LayerConfigTypes, StageConfigTypes } from '../types/Drawing';
import type { NormalizedPointerEvent, NormalizedPointerPhase, PointerSource } from './types';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function getPointerType(evt: any): PointerSource {
  const pt = evt?.pointerType;
  if (pt === 'mouse' || pt === 'pen' || pt === 'touch') return pt;
  // TouchEvent fallback
  if (evt?.touches || evt?.changedTouches) return 'touch';
  return 'unknown';
}

function getPressure(evt: any): number {
  // PointerEvent.pressure: 0~1
  if (typeof evt?.pressure === 'number') return clamp01(evt.pressure);
  // iOS Touch force: 0~1
  const force = evt?.touches?.[0]?.force ?? evt?.changedTouches?.[0]?.force;

  if (typeof force === 'number') return clamp01(force);
  return 0;
}

function getButtons(evt: any): { button?: number; buttons?: number; isPrimaryButton: boolean } {
  const button = typeof evt?.button === 'number' ? evt.button : undefined;
  const buttons = typeof evt?.buttons === 'number' ? evt.buttons : undefined;
  // Konva 里 mouse down 当前逻辑只认 button===0
  const isPrimaryButton =
    button === 0 || buttons === 1 || (button === undefined && buttons === undefined);
  return { button, buttons, isPrimaryButton };
}

function isPrimaryPointer(evt: any): boolean {
  if (typeof evt?.isPrimary === 'boolean') return evt.isPrimary;
  // Touch 默认认为 primary
  return true;
}

export function normalizeKonvaPointerEvent(
  e: Konva.KonvaEventObject<MouseEvent>,
  phase: NormalizedPointerPhase,
  layerConfig: LayerConfigTypes,
  _stageConfig: StageConfigTypes
): NormalizedPointerEvent {
  const stagePoint = (e?.target?.getStage()?.getRelativePointerPosition() as Vector2d) ?? null;
  const canvasPoint = stagePoint
    ? ({ x: stagePoint.x - layerConfig.x, y: stagePoint.y - layerConfig.y } as Vector2d)
    : null;

  const evtAny: any = e?.evt;
  const pointerType = getPointerType(evtAny);
  const pressure = getPressure(evtAny);

  const { button, buttons, isPrimaryButton } = getButtons(evtAny);
  const pointerId = typeof evtAny?.pointerId === 'number' ? evtAny.pointerId : undefined;
  const timeStamp = typeof evtAny?.timeStamp === 'number' ? evtAny.timeStamp : undefined;
  const shiftKey = typeof evtAny?.shiftKey === 'boolean' ? evtAny.shiftKey : false;
  const altKey = typeof evtAny?.altKey === 'boolean' ? evtAny.altKey : false;
  const ctrlKey = typeof evtAny?.ctrlKey === 'boolean' ? evtAny.ctrlKey : false;
  const metaKey = typeof evtAny?.metaKey === 'boolean' ? evtAny.metaKey : false;

  return {
    konvaEvent: e,
    phase,
    pointerId,
    pointerType,
    pressure,
    stagePoint,
    canvasPoint,
    isPrimary: isPrimaryPointer(evtAny),
    isPrimaryButton,
    button,
    buttons,
    timeStamp,
    shiftKey,
    altKey,
    ctrlKey,
    metaKey,
  };
}

export function isPointInCanvasBounds(stagePoint: Vector2d | null, layerConfig: LayerConfigTypes) {
  if (!stagePoint) return false;
  const { x, y, width, height } = layerConfig;
  return (
    stagePoint.x >= x &&
    stagePoint.x <= x + width &&
    stagePoint.y >= y &&
    stagePoint.y <= y + height
  );
}
