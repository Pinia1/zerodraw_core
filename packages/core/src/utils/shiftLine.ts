import { MIN_POINT } from './drawing';

const SNAP_STEP = Math.PI / 4;

/**
 * 将目标点吸附到从锚点出发的最近 45° 方向上。
 * 返回吸附后的坐标。
 */
export function snapPointTo45(
  ox: number,
  oy: number,
  tx: number,
  ty: number
): { x: number; y: number } {
  const dx = tx - ox;
  const dy = ty - oy;
  const angle = Math.atan2(dy, dx);
  const snapped = Math.round(angle / SNAP_STEP) * SNAP_STEP;
  const dist = Math.hypot(dx, dy);
  return {
    x: ox + Math.cos(snapped) * dist,
    y: oy + Math.sin(snapped) * dist,
  };
}

export interface ShiftLineResult {
  points: number[];
  pressure: number[];
}

/**
 * 基于锚点索引，保留锚点之前的曲线，
 * 从锚点到吸附终点之间插值生成足够多的共线点（满足 MIN_POINT 渲染阈值）。
 */
export function buildShiftLine(
  existingPoints: number[],
  existingPressure: number[],
  anchorIdx: number,
  endX: number,
  endY: number,
  endPressure: number
): ShiftLineResult {
  const ox = existingPoints[anchorIdx];
  const oy = existingPoints[anchorIdx + 1];

  const keepPoints = existingPoints.slice(0, anchorIdx + 2);
  const keepPressure = existingPressure.slice(0, anchorIdx / 2 + 1);
  const p0 = keepPressure[keepPressure.length - 1] ?? 0;

  const minSegs = Math.max(3, Math.ceil(MIN_POINT / 2));
  const needed = Math.max(minSegs, MIN_POINT - keepPoints.length / 2);
  const numSeg = Math.max(needed, 3);

  const pts = [...keepPoints];
  const prs = [...keepPressure];
  for (let i = 1; i <= numSeg; i++) {
    const t = i / numSeg;
    pts.push(ox + (endX - ox) * t, oy + (endY - oy) * t);
    prs.push(p0 + (endPressure - p0) * t);
  }

  return { points: pts, pressure: prs };
}
