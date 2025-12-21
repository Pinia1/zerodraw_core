import React from 'react';
import { Ellipse as KonvaEllipse } from 'react-konva';
import useHit from '../../../hooks/useHit';
import type { Ellipse as EllipseType } from '../../../types/Layers';

const Ellipse: React.FC<EllipseType> = (props) => {
  const { width, height, x, y, stroke, strokeWidth, opacity, fill } = props;

  const { handleMouseEnter, shapeOpacity } = useHit({ opacity: opacity || 1, id: props.id });

  return (
    <KonvaEllipse
      x={x}
      y={y}
      width={width}
      height={height}
      stroke={stroke}
      strokeWidth={strokeWidth / 2}
      opacity={shapeOpacity}
      fill={fill}
      radiusX={width / 2}
      radiusY={height / 2}
      onPointerEnter={handleMouseEnter}
    />
  );
};

export default React.memo(Ellipse);
