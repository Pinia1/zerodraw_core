import type Konva from 'konva';
import React, { useCallback, useMemo } from 'react';
import { Shape } from 'react-konva';
import type { Lasso } from '../../../types/Layers';

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

const EraserLasso: React.FC<Lasso> = (props) => {
  const points = props.points ?? [];
  const path2D = useMemo(() => buildClosedPath(points), [points]);

  const renderErase = useCallback(
    (ctx: Konva.Context) => {
      ctx.save();
      // 关键：区域橡皮擦，用 even-odd 填充语义支持“洞/多段”
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      ctx.fill(path2D, 'evenodd');
      ctx.restore();
    },
    [path2D]
  );

  if (!points.length) return null;

  return <Shape listening={false} sceneFunc={(ctx: Konva.Context) => renderErase(ctx)} />;
};

export default React.memo(EraserLasso);
