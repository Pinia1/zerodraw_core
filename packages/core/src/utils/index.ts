export function readScaleFromTransform(transform: string): number {
  if (!transform || transform === 'none') return 1;
  // matrix(a, b, c, d, tx, ty)
  if (transform.startsWith('matrix(')) {
    const parts = transform
      .slice('matrix('.length, -1)
      .split(',')
      .map((s) => Number.parseFloat(s.trim()));
    const [a, b] = parts;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
    const scaleX = Math.hypot(a, b);
    return Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1;
  }
  // matrix3d(...) scaleX=m11, scaleY=m22
  if (transform.startsWith('matrix3d(')) {
    const parts = transform
      .slice('matrix3d('.length, -1)
      .split(',')
      .map((s) => Number.parseFloat(s.trim()));
    const m11 = parts[0];
    const m22 = parts[5];
    const scaleX = Number.isFinite(m11) ? Math.abs(m11) : 1;
    const scaleY = Number.isFinite(m22) ? Math.abs(m22) : 1;
    // 取一个更稳的值（通常两者相等）
    const s = (scaleX + scaleY) / 2;
    return Number.isFinite(s) && s > 0 ? s : 1;
  }
  return 1;
}
