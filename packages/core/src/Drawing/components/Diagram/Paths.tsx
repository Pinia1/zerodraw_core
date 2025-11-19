import Konva from 'konva';
import React, { useCallback } from 'react';
import { Rect } from 'react-konva';
import type { Line } from '../../../types/Layers';
import { pint2DToPath } from '../../../utils/drawing';

const Paths: React.FC<Line> = (props) => {
  const renderAllPaths = useCallback((ctx: Konva.Context, path: string, line: Line) => {
    ctx.imageSmoothingEnabled = false;
    const path2D = new Path2D(path);
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

  return (
    <Rect sceneFunc={(ctx) => renderAllPaths(ctx, pint2DToPath(props.points, props), props)} />
  );
};

export default React.memo(Paths);
