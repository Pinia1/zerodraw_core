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

  // 如果结果几乎把 bbox 填满，则直接“吸附”为 bbox 的精确矩形轮廓，避免输出上千点的近似边界，
  // 并避免后续反选/再合并出现边缘残留。
  {
    const margin = 2;
    const x0 = margin;
    const y0 = margin;
    const x1 = Math.max(x0, w - margin);
    const y1 = Math.max(y0, h - margin);

    let missingInner = 0;
    let totalInner = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        totalInner++;
        if (mask[y * w + x] === 0) missingInner++;
      }
    }
    const allowanceInner = Math.max(16, Math.floor(totalInner * 0.0005));
    if (missingInner <= allowanceInner) {
      return [minX, minY, maxX, minY, maxX, maxY, minX, maxY];
    }
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

  const selectionCoversRect = () => {
    // 用离屏 mask 检测“当前选区是否几乎覆盖整个 rect”
    // 只用于判定，不用于输出轮廓，避免 marching-squares 的量化误差影响互逆性。
    const res = 2; // 判定分辨率：2 world units / px
    const pad = 2;
    const w = Math.max(3, Math.ceil(rw / res) + pad * 2 + 1);
    const h = Math.max(3, Math.ceil(rh / res) + pad * 2 + 1);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.setTransform(1 / res, 0, 0, 1 / res, -rx / res + pad, -ry / res + pad);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fff';
    for (const l of lassos) {
      const pts = l.points ?? [];
      if (pts.length < 4) continue;
      fillPointsPath(ctx, pts, 'evenodd');
    }
    ctx.restore();

    const img = ctx.getImageData(0, 0, w, h);

    // 关键：残留通常发生在“边缘若干像素”没填满，或 merge 量化导致外轮廓略微内缩。
    // 因此这里用“忽略边缘 margin 的内部区域覆盖率”作为全选判定（更鲁棒）。
    const margin = 4; // mask 像素。res=2 时约等于 8 个世界单位
    const x0 = margin;
    const y0 = margin;
    const x1 = Math.max(x0, w - margin);
    const y1 = Math.max(y0, h - margin);

    let missingInner = 0;
    let totalInner = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        totalInner++;
        const i = (y * w + x) * 4 + 3;
        if (img.data[i] === 0) missingInner++;
      }
    }

    // 用覆盖率判断：只要内部区域几乎全满，就认为“全选”
    if (totalInner <= 0) return false;
    const missingRatio = missingInner / totalInner;
    // 允许最多 0.3% 缺失（主要覆盖量化导致的边缘内缩/锯齿洞）
    return missingRatio <= 0.003;
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
    // 匹配“画布矩形外轮廓”的鲁棒判定：
    // - marching-squares 输出的外轮廓会有很多点，不一定包含精确角点/顺序
    // - 因此用 bounding box 接近 rectRing 的方式识别
    if (ring.length < 8) return false;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < ring.length; i += 2) {
      const x = ring[i];
      const y = ring[i + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    if (
      !Number.isFinite(minX) ||
      !Number.isFinite(minY) ||
      !Number.isFinite(maxX) ||
      !Number.isFinite(maxY)
    ) {
      return false;
    }
    const tol = 4; // world units 容差（覆盖 marching-squares 的 0.5/1/2 步进误差）
    if (Math.abs(minX - rectRing[0]) > tol) return false;
    if (Math.abs(minY - rectRing[1]) > tol) return false;
    if (Math.abs(maxX - rectRing[4]) > tol) return false;
    if (Math.abs(maxY - rectRing[5]) > tol) return false;
    return true;
  };

  const selectionPoints = flattenLassos();
  const selectionRings = splitRings(selectionPoints);

  // 空选反选：直接返回精确矩形环（确定性，无误差）
  if (selectionRings.length === 0) return rectRing;

  const outerRings = selectionRings.filter((r) => ringMatchesRect(r));
  const remainingRings = selectionRings.filter((r) => !ringMatchesRect(r));

  // 1) 当前是“全选矩形”（只有一个外轮廓）：反选直接清空
  // 2) 当前是“矩形外轮廓 + 若干洞”（例如：全选后减去一块）：反选结果就是这些洞本身
  if (outerRings.length > 0) {
    // 只有外轮廓（无洞） => 清空
    if (remainingRings.length === 0) return [];
    // 有洞 => 返回洞（这对应：空白->反选(全选)->减选->反选  应只剩减选区域）
    const out: number[] = [];
    for (let i = 0; i < remainingRings.length; i++) {
      if (i > 0) out.push(NaN, NaN);
      out.push(...remainingRings[i]);
    }
    return out;
  }

  // 仅在“单一大轮廓”时使用覆盖判定作为兜底（避免把“矩形外轮廓 + 小洞”误判为全选）
  if (selectionRings.length === 1 && selectionCoversRect()) return [];

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
