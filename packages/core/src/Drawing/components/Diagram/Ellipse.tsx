import React from 'react';
import { Ellipse as KonvaEllipse } from 'react-konva';
import type { Ellipse as EllipseType } from '../../../types/Layers';

const Ellipse: React.FC<EllipseType> = (props) => {
  const { width, height, x, y, stroke, strokeWidth, opacity, fill } = props;

  return (
    <KonvaEllipse
      x={x}
      y={y}
      width={width}
      height={height}
      stroke={stroke}
      strokeWidth={strokeWidth / 2}
      opacity={opacity}
      fill={fill}
      radiusX={width / 2}
      radiusY={height / 2}
    />
  );
};

export default React.memo(Ellipse);
