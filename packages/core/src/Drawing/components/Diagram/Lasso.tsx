import Konva from 'konva';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Rect, Shape } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import useToolsStore from '../../../store/useTools';
import { Actions, LassoMode } from '../../../types/Drawing';
import type { Lasso } from '../../../types/Layers';

type Props = {
  lassos?: Lasso[];
};

type Bounds = { x: number; y: number; width: number; height: number };

type Segment = { x1: number; y1: number; x2: number; y2: number };

function segKey(a: { x: number; y: number }, b: { x: number; y: number }) {
  // undirected key for merging segments
  const ax = a.x.toFixed(3);
  const ay = a.y.toFixed(3);
  const bx = b.x.toFixed(3);
  const by = b.y.toFixed(3);
  return ax < bx || (ax === bx && ay <= by) ? `${ax},${ay}|${bx},${by}` : `${bx},${by}|${ax},${ay}`;
}

function marchingSquaresSegments(mask: Uint8Array, w: number, h: number): Segment[] {
  // mask is alpha>0 as 0/1 values for each pixel [0..w*h)
  const segs: Segment[] = [];
  const idx = (x: number, y: number) => y * w + x;

  // Standard marching squares on cell corners (x,y) .. (x+1,y+1)
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const tl = mask[idx(x, y)] ? 1 : 0;
      const tr = mask[idx(x + 1, y)] ? 1 : 0;
      const br = mask[idx(x + 1, y + 1)] ? 1 : 0;
      const bl = mask[idx(x, y + 1)] ? 1 : 0;
      const c = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (c === 0 || c === 15) continue;

      // midpoints on edges of the cell (in pixel coords)
      const top = { x: x + 0.5, y };
      const right = { x: x + 1, y: y + 0.5 };
      const bottom = { x: x + 0.5, y: y + 1 };
      const left = { x, y: y + 0.5 };

      // For ambiguous cases (5,10) we just emit two segments (good enough for selection outline).
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

type MaskData = {
  canvas: HTMLCanvasElement;
  mask: Uint8Array;
  w: number;
  h: number;
  /** world units per pixel in the mask */
  res: number;
  /** padding in pixels */
  pad: number;
};

function buildCompositeMaskData(
  derived: Array<{ mode: LassoMode; path2D: Path2D; points: number[] }>,
  allBounds: Bounds
): MaskData | null {
  if (!derived.length || allBounds.width <= 0 || allBounds.height <= 0) return null;

  // tradeoff: larger res -> faster but more jaggy outline
  const res = 2; // world units per pixel in the mask
  const pad = 2; // pixels
  const w = Math.max(3, Math.ceil(allBounds.width / res) + pad * 2 + 1);
  const h = Math.max(3, Math.ceil(allBounds.height / res) + pad * 2 + 1);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  // world -> mask pixel transform: px = (x - allBounds.x)/res + pad
  ctx.setTransform(1 / res, 0, 0, 1 / res, -allBounds.x / res + pad, -allBounds.y / res + pad);

  // ADD fill (union via source-over on empty canvas)
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#fff';
  for (const d of derived) {
    if (d.points.length < 4) continue;
    if (d.mode === LassoMode.ADD) ctx.fill(d.path2D);
  }

  // REMOVE carve (subtract)
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  for (const d of derived) {
    if (d.points.length < 4) continue;
    if (d.mode === LassoMode.REMOVE) ctx.fill(d.path2D);
  }

  ctx.restore();

  const img = ctx.getImageData(0, 0, w, h);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    mask[i] = img.data[i * 4 + 3] > 0 ? 1 : 0;
  }

  return { canvas, mask, w, h, res, pad };
}

function segmentsToPath2D(
  segs: Segment[],
  scale: number,
  offsetX: number,
  offsetY: number
): Path2D {
  // Join segments into polylines via adjacency, then build a Path2D.
  const p = new Path2D();
  if (!segs.length) return p;

  const pointKey = (x: number, y: number) => `${x.toFixed(3)},${y.toFixed(3)}`;
  const adj = new Map<string, Array<{ x: number; y: number }>>();
  const addEdge = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const ka = pointKey(a.x, a.y);
    const kb = pointKey(b.x, b.y);
    if (!adj.has(ka)) adj.set(ka, []);
    if (!adj.has(kb)) adj.set(kb, []);
    adj.get(ka)!.push(b);
    adj.get(kb)!.push(a);
  };

  const used = new Set<string>();
  for (const s of segs) {
    const a = { x: s.x1, y: s.y1 };
    const b = { x: s.x2, y: s.y2 };
    addEdge(a, b);
  }

  const takeEdge = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const k = segKey(a, b);
    if (used.has(k)) return false;
    used.add(k);
    return true;
  };

  // Start from endpoints (degree 1) first, then any remaining cycles.
  const nodes = Array.from(adj.entries()).map(([k, v]) => ({ k, v }));
  const starts = nodes.filter((n) => n.v.length === 1).map((n) => n.k);
  const allStarts = starts.length ? starts : nodes.map((n) => n.k);

  for (const startKey of allStarts) {
    const startNeighbors = adj.get(startKey);
    if (!startNeighbors || startNeighbors.length === 0) continue;

    const [sx, sy] = startKey.split(',').map(Number);
    const start = { x: sx, y: sy };

    // try every neighbor as a direction
    for (const first of startNeighbors) {
      if (!takeEdge(start, first)) continue;

      // begin a polyline
      p.moveTo(start.x * scale + offsetX, start.y * scale + offsetY);
      p.lineTo(first.x * scale + offsetX, first.y * scale + offsetY);

      let prev = start;
      let curr = first;

      while (true) {
        const neigh = adj.get(pointKey(curr.x, curr.y)) ?? [];
        // pick next neighbor that isn't the previous point and whose edge unused
        let next: { x: number; y: number } | null = null;
        for (const cand of neigh) {
          if (cand.x === prev.x && cand.y === prev.y) continue;
          if (takeEdge(curr, cand)) {
            next = cand;
            break;
          }
        }
        if (!next) break;
        p.lineTo(next.x * scale + offsetX, next.y * scale + offsetY);
        prev = curr;
        curr = next;
      }
    }
  }

  return p;
}

function buildOutlinePathFromMaskData(maskData: MaskData, allBounds: Bounds) {
  const segs = marchingSquaresSegments(maskData.mask, maskData.w, maskData.h);
  // Convert mask pixel coords back to world coords:
  // world = (px - pad) * res + allBounds.x
  const scale = maskData.res;
  const offsetX = allBounds.x - maskData.pad * maskData.res;
  const offsetY = allBounds.y - maskData.pad * maskData.res;
  return segmentsToPath2D(segs, scale, offsetX, offsetY);
}

function buildClosedPath(points: number[]) {
  const p = new Path2D();
  if (points.length >= 4) {
    p.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      p.lineTo(points[i], points[i + 1]);
    }
    p.closePath();
  }
  return p;
}

function calcBounds(points: number[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
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
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const pad = 2;
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

const LassoView: React.FC<Props> = ({ lassos = [] }) => {
  const layerRef = useRef<Konva.Layer | null>(null);
  const dashOffsetRef = useRef(0);

  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );

  const derived = useMemo(() => {
    return lassos.map((l) => ({
      id: l.id,
      mode: l.mode ?? LassoMode.ADD,
      points: l.points,
      path2D: buildClosedPath(l.points),
      bounds: calcBounds(l.points),
    }));
  }, [lassos]);

  const allBounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const d of derived) {
      if (d.points.length < 4) continue;
      minX = Math.min(minX, d.bounds.x);
      minY = Math.min(minY, d.bounds.y);
      maxX = Math.max(maxX, d.bounds.x + d.bounds.width);
      maxY = Math.max(maxY, d.bounds.y + d.bounds.height);
    }

    if (
      !Number.isFinite(minX) ||
      !Number.isFinite(minY) ||
      !Number.isFinite(maxX) ||
      !Number.isFinite(maxY)
    ) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [derived]);

  const maskData = useMemo(() => {
    return buildCompositeMaskData(
      derived.map((d) => ({ mode: d.mode, path2D: d.path2D, points: d.points })),
      allBounds
    );
  }, [derived, allBounds]);

  const outlinePath = useMemo(() => {
    if (!maskData) return new Path2D();
    return buildOutlinePathFromMaskData(maskData, allBounds);
  }, [maskData, allBounds]);

  useEffect(() => {
    const speed = 16;
    let cancelled = false;

    const anim = new Konva.Animation((frame) => {
      const dt = (frame?.timeDiff ?? 16) / 1000;
      dashOffsetRef.current = (dashOffsetRef.current + speed * dt) % 10000;

      layerRef.current?.batchDraw();
    });

    const ensureStart = () => {
      if (cancelled) return;
      const layer = layerRef.current;
      if (!layer) {
        requestAnimationFrame(ensureStart);
        return;
      }
      anim.setLayers(layer);
      anim.start();
    };

    ensureStart();
    return () => {
      cancelled = true;
      anim.stop();
    };
  }, []);

  const renderAllLassos = useCallback(
    (ctx: Konva.Context) => {
      ctx.imageSmoothingEnabled = false;
      ctx.save();

      // 1) 填充：基于最终合成后的 mask 一次性绘制，避免重叠区域 alpha 叠加变深
      if (maskData) {
        const dx = allBounds.x - maskData.pad * maskData.res;
        const dy = allBounds.y - maskData.pad * maskData.res;
        const dw = maskData.w * maskData.res;
        const dh = maskData.h * maskData.res;

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0, 120, 215, 0.12)';
        ctx.fillRect(dx, dy, dw, dh);

        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskData.canvas, dx, dy, dw, dh);
      }

      // 2) “蚂蚁线”描边：对「最终合成的选区边界」描边（而不是对每条 lasso 单独描边）
      ctx.globalCompositeOperation = 'source-over';
      const dash = [6, 6];
      ctx.lineWidth = 1;
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'butt';
      ctx.setLineDash(dash);

      const offset = dashOffsetRef.current;
      (ctx as unknown as { lineDashOffset: number }).lineDashOffset = -offset;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke(outlinePath);

      (ctx as unknown as { lineDashOffset: number }).lineDashOffset = -(offset + dash[0]);
      ctx.strokeStyle = '#000000';
      ctx.stroke(outlinePath);

      // 清理虚线设置，避免影响后续绘制
      ctx.setLineDash([]);
      (ctx as unknown as { lineDashOffset: number }).lineDashOffset = 0;
      ctx.restore();
    },
    [allBounds, maskData, outlinePath]
  );

  if (!derived.length) return null;

  return (
    <>
      <Shape
        ref={(node) => {
          if (node && !layerRef.current) {
            layerRef.current = node.getLayer();
          }
        }}
        listening={activeKey === Actions.ROPE}
        hitFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.rect(allBounds.x, allBounds.y, allBounds.width, allBounds.height);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
        sceneFunc={(ctx: Konva.Context) => renderAllLassos(ctx)}
      />
      <Rect
        x={allBounds.x}
        y={allBounds.y}
        width={allBounds.width}
        height={allBounds.height}
        fillEnabled={false}
        strokeEnabled={false}
        perfectDrawEnabled={false}
        listening={true}
      />
    </>
  );
};

export default React.memo(LassoView);
