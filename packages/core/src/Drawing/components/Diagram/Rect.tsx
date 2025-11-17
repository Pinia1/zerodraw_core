import React from 'react';
import { Rect as KonvaRect } from 'react-konva';
import type { Rect as RectType } from '../../../types/Layers';

const Rect: React.FC<RectType> = (props) => {
  return (
    <KonvaRect
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth / 2}
      opacity={props.opacity}
      fill={props.fill}
    />
  );
};

export default React.memo(Rect);
