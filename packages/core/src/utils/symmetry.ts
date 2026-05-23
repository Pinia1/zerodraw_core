const ANGLE_SNAP_STEP = 45;
const ANGLE_SNAP_THRESHOLD = 4;
const ROTATION_HANDLE_DISTANCE = 80;

/**
 * 将点 (px, py) 关于对称轴做镜像反射。
 * 对称轴过点 (cx, cy)，方向角为 rotationDeg（0 = 竖轴，顺时针为正）。
 */
export function reflectPoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  rotationDeg: number
): { x: number; y: number } {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // 平移到原点
  const dx = px - cx;
  const dy = py - cy;
  // 关于过原点方向 (sin, -cos) 的轴反射：r = 2(d·u)u - d
  const dot = dx * sin + dy * (-cos);
  const rx = 2 * dot * sin - dx;
  const ry = 2 * dot * (-cos) - dy;
  return { x: rx + cx, y: ry + cy };
}

export function snapAngle(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360;
  const nearest = Math.round(normalized / ANGLE_SNAP_STEP) * ANGLE_SNAP_STEP;
  if (Math.abs(normalized - nearest) < ANGLE_SNAP_THRESHOLD) {
    return nearest >= 360 ? nearest - 360 : nearest;
  }
  return angle;
}

export function getRotationHandlePosition(
  centerX: number,
  centerY: number,
  rotation: number
): { x: number; y: number } {
  const rad = (rotation * Math.PI) / 180;
  return {
    x: centerX + Math.sin(rad) * ROTATION_HANDLE_DISTANCE,
    y: centerY - Math.cos(rad) * ROTATION_HANDLE_DISTANCE,
  };
}
