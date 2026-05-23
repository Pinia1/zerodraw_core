const ANGLE_SNAP_STEP = 45;
const ANGLE_SNAP_THRESHOLD = 4;
const ROTATION_HANDLE_DISTANCE = 80;

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
