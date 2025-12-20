import Konva from 'konva';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Rect, Shape } from 'react-konva';
import type { Lasso } from '../../../types/Layers';

type Bounds = { x: number; y: number; width: number; height: number };

function buildClosedPath(points: number[]) {
  // 支持 NaN,NaN 分隔的多段闭合路径（外轮廓 + 内洞）
  const p = new Path2D();
  let started = false;
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      if (started) p.closePath();
      started = false;
      continue;
    }
    if (!started) {
      started = true;
      p.moveTo(x, y);
    } else {
      p.lineTo(x, y);
    }
  }
  if (started) p.closePath();
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
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue; // 跳过 NaN 分隔符
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

const LassoView: React.FC<Lasso> = (props) => {
  const layerRef = useRef<Konva.Layer | null>(null);
  const dashOffsetRef = useRef(0);

  const points = props.points ?? [];
  const bounds = useMemo(() => calcBounds(points), [points]);
  const path2D = useMemo(() => buildClosedPath(points), [points]);

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

  const renderLasso = useCallback(
    (ctx: Konva.Context) => {
      ctx.imageSmoothingEnabled = false;
      ctx.save();

      // 1) 填充（单条 lasso）
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 120, 215, 0.12)';
      ctx.fill(path2D, 'evenodd');

      // 2) “蚂蚁线”描边：只描边当前这一条 lasso
      ctx.globalCompositeOperation = 'source-over';
      const dash = [6, 6];
      ctx.lineWidth = 1;
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'butt';
      ctx.setLineDash(dash);

      const offset = dashOffsetRef.current;
      (ctx as unknown as { lineDashOffset: number }).lineDashOffset = -offset;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke(path2D);

      (ctx as unknown as { lineDashOffset: number }).lineDashOffset = -(offset + dash[0]);
      ctx.strokeStyle = '#000000';
      ctx.stroke(path2D);

      // 清理虚线设置，避免影响后续绘制
      ctx.setLineDash([]);
      (ctx as unknown as { lineDashOffset: number }).lineDashOffset = 0;
      ctx.restore();
    },
    [path2D]
  );

  if (!points.length) return null;

  return (
    <>
      <Shape
        ref={(node) => {
          if (node && !layerRef.current) {
            layerRef.current = node.getLayer();
          }
        }}
        hitFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
        sceneFunc={(ctx: Konva.Context) => renderLasso(ctx)}
      />
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fillEnabled={false}
        strokeEnabled={false}
        perfectDrawEnabled={false}
        listening={true}
      />
    </>
  );
};

export default React.memo(LassoView);
