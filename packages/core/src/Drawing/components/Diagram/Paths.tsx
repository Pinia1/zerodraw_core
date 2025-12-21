import Konva from 'konva';
import React, { useCallback, useMemo } from 'react';
import { Path as KonvaPath, Rect, Shape } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import useHit from '../../../hooks/useHit';
import useToolsStore from '../../../store/useTools';
import { Actions } from '../../../types/Drawing';
import type { Line } from '../../../types/Layers';
import { MIN_POINT, pint2DToPath } from '../../../utils/drawing';

interface PathProps extends Line {
  removeTag?: boolean;
}
const Paths: React.FC<PathProps> = (props) => {
  const { points, opacity, removeTag = true } = props;

  const { shapeOpacity, handleMouseEnter } = useHit({ opacity, id: props.id });

  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );

  const svgPath = useMemo(() => pint2DToPath(points, props), [points, props]);

  const path2D = useMemo(() => {
    return new Path2D(svgPath);
  }, [svgPath]);

  const bounds = useMemo(() => {
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

  const renderAllPaths = useCallback(
    (ctx: Konva.Context, p2d: Path2D, line: Line) => {
      ctx.imageSmoothingEnabled = false;
      ctx.save();

      ctx.globalAlpha = shapeOpacity;
      if (line.fill) {
        ctx.fillStyle = line.stroke;
        ctx.fill(p2d);
      } else {
        ctx.strokeStyle = line.stroke;
        ctx.stroke(p2d);
      }

      ctx.restore();
    },
    [shapeOpacity]
  );

  if (points.length < MIN_POINT) return null;

  const isRemove = activeKey === Actions.REMOVE;
  const isRope = activeKey === Actions.ROPE;

  return (
    <>
      <Shape
        listening={isRope}
        sceneFunc={(ctx: Konva.Context) => renderAllPaths(ctx, path2D, props)}
      />

      {isRemove && removeTag && (
        <KonvaPath
          data={svgPath}
          listening={true}
          stroke="transparent"
          strokeWidth={props.strokeWidth}
          lineCap="round"
          lineJoin="round"
          perfectDrawEnabled={false}
          onPointerEnter={handleMouseEnter}
        />
      )}

      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fillEnabled={false}
        strokeEnabled={false}
        perfectDrawEnabled={false}
        listening={isRope}
      />
    </>
  );
};

export default React.memo(Paths);
