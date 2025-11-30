import Konva from 'konva';
import React, { useCallback, useMemo } from 'react';
import { Path, Shape } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../../store/useDrawing';
import useToolsStore from '../../../store/useTools';
import { Actions } from '../../../types/Drawing';
import type { Line } from '../../../types/Layers';
import { pint2DToPath } from '../../../utils/drawing';

//todo Performance comparison
const Paths: React.FC<Line> = (props) => {
  const { points, stroke, opacity } = props;

  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );
  const { drawingId } = useDrawingStore(
    useShallow((state) => ({
      drawingId: state.drawingId,
    }))
  );

  const path = useMemo(() => {
    return pint2DToPath(points, props);
  }, [points]);

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

  //todo
  return <Path data={path} fill={stroke} opacity={opacity} listening={false} />;

  if (activeKey === Actions.FILL || drawingId) {
    return <Path data={path} fill={stroke} opacity={opacity} listening={false} />;
  }
  return <Shape sceneFunc={(ctx: Konva.Context) => renderAllPaths(ctx, path, props)} />;
};

export default React.memo(Paths);
