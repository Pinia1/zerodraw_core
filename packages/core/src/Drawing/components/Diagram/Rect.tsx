import React from 'react';
import { Rect as KonvaRect } from 'react-konva';
import useHit from '../../../hooks/useHit';
import type { Rect as RectType } from '../../../types/Layers';

const Rect: React.FC<RectType> = (props) => {
  const { handleMouseEnter, shapeOpacity } = useHit({ opacity: props.opacity, id: props.id });

  return (
    <KonvaRect
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth / 2}
      fill={props.fill}
      lineCap="round"
      lineJoin="round"
      onPointerEnter={handleMouseEnter}
      opacity={shapeOpacity}
    />
  );
};

export default React.memo(Rect);
