import Konva from 'konva';
import React, { useCallback, useMemo } from 'react';
import { Rect, Shape } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import useToolsStore from '../../../store/useTools';
import { Actions } from '../../../types/Drawing';
import type { Line } from '../../../types/Layers';
import { pint2DToPath } from '../../../utils/drawing';

const Paths: React.FC<Line> = (props) => {
  const { points, opacity } = props;

  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );

  const path2D = useMemo(() => {
    return new Path2D(pint2DToPath(points, props));
  }, [points]);

  const bounds = useMemo(() => {
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

    const pad = Math.max(2, props.strokeWidth);
    return {
      x: minX - pad,
      y: minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    };
  }, [points, props.strokeWidth]);

  const renderAllPaths = useCallback((ctx: Konva.Context, path2D: Path2D, line: Line) => {
    ctx.imageSmoothingEnabled = false;
    ctx.save();

    ctx.globalAlpha = line.opacity;
    if (line.fill) {
      ctx.fillStyle = line.stroke;
      ctx.fill(path2D);
    } else {
      ctx.strokeStyle = line.stroke;
      ctx.stroke(path2D);
    }

    ctx.restore();
  }, []);

  if (points.length < 4) return null;

  return (
    <>
      <Shape
        opacity={opacity}
        listening={activeKey === Actions.ROPE}
        hitFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
        sceneFunc={(ctx: Konva.Context) => renderAllPaths(ctx, path2D, props)}
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

export default React.memo(Paths);
