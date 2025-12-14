/**
 * 套索工具函数
 */

import { LassoMode } from '../types/Drawing';

type Segment = { x1: number; y1: number; x2: number; y2: number };

function fillPointsPath(
  ctx: CanvasRenderingContext2D,
  points: number[],
  fillRule: CanvasFillRule = 'evenodd'
) {
  if (points.length < 4) return;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      if (started) ctx.closePath();
      started = false;
      continue;
    }
    if (!started) {
      started = true;
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  if (started) ctx.closePath();
  ctx.fill(fillRule);
}

function segKey(a: { x: number; y: number }, b: { x: number; y: number }) {
  const ax = a.x.toFixed(3);
  const ay = a.y.toFixed(3);
  const bx = b.x.toFixed(3);
  const by = b.y.toFixed(3);
  return ax < bx || (ax === bx && ay <= by) ? `${ax},${ay}|${bx},${by}` : `${bx},${by}|${ax},${ay}`;
}

function marchingSquares(mask: Uint8Array, w: number, h: number): Segment[] {
  const segs: Segment[] = [];
  const idx = (x: number, y: number) => y * w + x;

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const tl = mask[idx(x, y)] ? 1 : 0;
      const tr = mask[idx(x + 1, y)] ? 1 : 0;
      const br = mask[idx(x + 1, y + 1)] ? 1 : 0;
      const bl = mask[idx(x, y + 1)] ? 1 : 0;
      const c = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (c === 0 || c === 15) continue;

      const top = { x: x + 0.5, y };
      const right = { x: x + 1, y: y + 0.5 };
      const bottom = { x: x + 0.5, y: y + 1 };
      const left = { x, y: y + 0.5 };

      switch (c) {
        case 1:
        case 14:
          segs.push({ x1: left.x, y1: left.y, x2: bottom.x, y2: bottom.y });
          break;
        case 2:
        case 13:
          segs.push({ x1: bottom.x, y1: bottom.y, x2: right.x, y2: right.y });
          break;
        case 3:
        case 12:
          segs.push({ x1: left.x, y1: left.y, x2: right.x, y2: right.y });
          break;
        case 4:
        case 11:
          segs.push({ x1: top.x, y1: top.y, x2: right.x, y2: right.y });
          break;
        case 6:
        case 9:
          segs.push({ x1: top.x, y1: top.y, x2: bottom.x, y2: bottom.y });
          break;
        case 7:
        case 8:
          segs.push({ x1: top.x, y1: top.y, x2: left.x, y2: left.y });
          break;
        case 5:
          segs.push({ x1: top.x, y1: top.y, x2: left.x, y2: left.y });
          segs.push({ x1: right.x, y1: right.y, x2: bottom.x, y2: bottom.y });
          break;
        case 10:
          segs.push({ x1: top.x, y1: top.y, x2: right.x, y2: right.y });
          segs.push({ x1: left.x, y1: left.y, x2: bottom.x, y2: bottom.y });
          break;
      }
    }
  }
  return segs;
}

function segmentsToPolylines(segs: Segment[]): Array<Array<{ x: number; y: number }>> {
  if (!segs.length) return [];

  const pointKey = (x: number, y: number) => `${x.toFixed(3)},${y.toFixed(3)}`;
  const adj = new Map<string, Array<{ x: number; y: number }>>();

  for (const s of segs) {
    const a = { x: s.x1, y: s.y1 };
    const b = { x: s.x2, y: s.y2 };
    const ka = pointKey(a.x, a.y);
    const kb = pointKey(b.x, b.y);
    if (!adj.has(ka)) adj.set(ka, []);
    if (!adj.has(kb)) adj.set(kb, []);
    adj.get(ka)!.push(b);
    adj.get(kb)!.push(a);
  }

  const used = new Set<string>();
  const takeEdge = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const k = segKey(a, b);
    if (used.has(k)) return false;
    used.add(k);
    return true;
  };

  const polylines: Array<Array<{ x: number; y: number }>> = [];
  const nodes = Array.from(adj.entries()).map(([k, v]) => ({ k, v }));
  const starts = nodes.filter((n) => n.v.length === 1).map((n) => n.k);
  const allStarts = starts.length ? starts : nodes.map((n) => n.k);

  for (const startKey of allStarts) {
    const startNeighbors = adj.get(startKey);
    if (!startNeighbors || startNeighbors.length === 0) continue;

    const [sx, sy] = startKey.split(',').map(Number);
    const start = { x: sx, y: sy };

    for (const first of startNeighbors) {
      if (!takeEdge(start, first)) continue;

      const poly: Array<{ x: number; y: number }> = [start, first];
      let prev = start;
      let curr = first;

      while (true) {
        const neigh = adj.get(pointKey(curr.x, curr.y)) ?? [];
        let next: { x: number; y: number } | null = null;
        for (const cand of neigh) {
          if (cand.x === prev.x && cand.y === prev.y) continue;
          if (takeEdge(curr, cand)) {
            next = cand;
            break;
          }
        }
        if (!next) break;
        poly.push(next);
        prev = curr;
        curr = next;
      }

      if (poly.length >= 3) polylines.push(poly);
    }
  }

  return polylines;
}

/**
 * 检测两个 lasso 是否有交集（包围盒重叠检测）
 */
export function hasIntersection(points1: number[], points2: number[]): boolean {
  const getBounds = (points: number[]) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < points.length; i += 2) {
      const x = points[i];
      const y = points[i + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }

    return { minX, minY, maxX, maxY };
  };

  const b1 = getBounds(points1);
  const b2 = getBounds(points2);

  // 包围盒重叠检测
  return !(b1.maxX < b2.minX || b2.maxX < b1.minX || b1.maxY < b2.minY || b2.maxY < b1.minY);
}

/**
 * 合并多个 lasso，按绘制顺序应用 ADD/REMOVE 操作
 *
 * @param lassos 按绘制顺序排列的 lasso 数组
 * @returns 合并后的边界点（可能包含多段，用 NaN,NaN 分隔）
 */
export function mergeLassos(lassos: Array<{ points: number[]; mode: LassoMode }>): number[] {
  if (lassos.length === 0) return [];
  if (lassos.length === 1) return lassos[0].points;

  // 计算包围盒
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const lasso of lassos) {
    for (let i = 0; i < lasso.points.length; i += 2) {
      const x = lasso.points[i];
      const y = lasso.points[i + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return lassos[0].points;
  }

  // 离屏 canvas：用较粗分辨率（加速）
  const res = 2; // 每像素 2 个世界单位
  const pad = 2; // 像素 padding
  const w = Math.max(3, Math.ceil((maxX - minX) / res) + pad * 2 + 1);
  const h = Math.max(3, Math.ceil((maxY - minY) / res) + pad * 2 + 1);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return lassos[0].points;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.setTransform(1 / res, 0, 0, 1 / res, -minX / res + pad, -minY / res + pad);

  // 按顺序应用每个 lasso（支持"先减后加"能重新显示）
  for (const lasso of lassos) {
    if (lasso.mode === LassoMode.REMOVE) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#fff';
    }
    // points 可能包含 NaN,NaN 分隔符（多段闭合路径/洞），必须按分段填充
    fillPointsPath(ctx, lasso.points, 'evenodd');
  }

  ctx.restore();

  // 提取 mask
  const img = ctx.getImageData(0, 0, w, h);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    mask[i] = img.data[i * 4 + 3] > 0 ? 1 : 0;
  }

  // marching squares 提取轮廓
  const segs = marchingSquares(mask, w, h);
  if (!segs.length) return [];

  const polylines = segmentsToPolylines(segs);
  if (!polylines.length) return [];

  // 转成 points 数组（多段用 NaN,NaN 分隔）
  const result: number[] = [];
  for (let i = 0; i < polylines.length; i++) {
    if (i > 0) {
      result.push(NaN, NaN); // 分段标记
    }
    const poly = polylines[i];
    for (const pt of poly) {
      // mask pixel coords -> world coords
      const worldX = (pt.x - pad) * res + minX;
      const worldY = (pt.y - pad) * res + minY;
      result.push(worldX, worldY);
    }
  }

  return result;
}
