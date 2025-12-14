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

/**
 * 反选：在给定画布矩形范围内，对当前选区取补集。
 * - 如果当前没有选区：结果为“全画布选中”（轮廓为画布边框）
 * - 如果当前有选区：结果为“全画布 - 选区”（包含画布边框 + 选区洞的轮廓）
 *
 * @param lassos 当前选区（通常都是 ADD 的最终轮廓；points 允许 NaN 分段）
 * @param rect 画布范围（通常为 {x:0,y:0,width,height}）
 */
export function invertLassos(
  lassos: Array<{ points: number[] }>,
  rect: { x: number; y: number; width: number; height: number }
): number[] {
  const { x: rx, y: ry, width: rw, height: rh } = rect;
  if (rw <= 0 || rh <= 0) return [];

  // 反选在“even-odd 填充语义”下可以用纯几何 XOR 实现：
  // 反选 = (画布矩形环) ⊕ (当前选区的所有环)
  // 这样可保证“有内容 -> 反选 -> 再反选”严格回到原选区，不会因 mask 量化产生边缘残留。

  const rectRing = [rx, ry, rx + rw, ry, rx + rw, ry + rh, rx, ry + rh];

  const splitRings = (points: number[]) => {
    const rings: number[][] = [];
    let cur: number[] = [];
    for (let i = 0; i < points.length; i += 2) {
      const x = points[i];
      const y = points[i + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        if (cur.length >= 4) rings.push(cur);
        cur = [];
        continue;
      }
      cur.push(x, y);
    }
    if (cur.length >= 4) rings.push(cur);
    return rings;
  };

  const flattenLassos = () => {
    const out: number[] = [];
    for (const l of lassos) {
      const pts = l.points ?? [];
      if (pts.length < 4) continue;
      if (out.length) out.push(NaN, NaN);
      out.push(...pts);
    }
    return out;
  };

  const ringMatchesRect = (ring: number[]) => {
    // 允许从任意角开始、顺/逆时针
    if (ring.length < 8) return false;
    const eps = 1e-3;
    const corners = [
      { x: rectRing[0], y: rectRing[1] },
      { x: rectRing[2], y: rectRing[3] },
      { x: rectRing[4], y: rectRing[5] },
      { x: rectRing[6], y: rectRing[7] },
    ];
    const used = new Array(4).fill(false);
    // 取 ring 的前 4 个点（通常就是 4 个角点），并允许重复点/多余点存在
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < ring.length && pts.length < 4; i += 2) {
      const x = ring[i];
      const y = ring[i + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      pts.push({ x, y });
    }
    if (pts.length !== 4) return false;
    for (const pt of pts) {
      let ok = false;
      for (let i = 0; i < corners.length; i++) {
        if (used[i]) continue;
        if (Math.abs(pt.x - corners[i].x) <= eps && Math.abs(pt.y - corners[i].y) <= eps) {
          used[i] = true;
          ok = true;
          break;
        }
      }
      if (!ok) return false;
    }
    return used.every(Boolean);
  };

  const selectionPoints = flattenLassos();
  const selectionRings = splitRings(selectionPoints);

  // 空选反选：直接返回精确矩形环（确定性，无误差）
  if (selectionRings.length === 0) return rectRing;

  // 如果当前已经包含“画布矩形环”，反选就等价于把它移除（XOR 取消）
  const remainingRings = selectionRings.filter((r) => !ringMatchesRect(r));
  if (remainingRings.length !== selectionRings.length) {
    // 说明包含 rectRing：移除后返回剩余环（可能为空）
    if (!remainingRings.length) return [];
    const out: number[] = [];
    for (let i = 0; i < remainingRings.length; i++) {
      if (i > 0) out.push(NaN, NaN);
      out.push(...remainingRings[i]);
    }
    return out;
  }

  // 普通情况：rectRing + 所有选区环（even-odd 下表示 rect\selection）
  return [
    rectRing[0],
    rectRing[1],
    rectRing[2],
    rectRing[3],
    rectRing[4],
    rectRing[5],
    rectRing[6],
    rectRing[7],
    NaN,
    NaN,
    ...selectionPoints,
  ];
}
