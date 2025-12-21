import type Konva from 'konva';
import React from 'react';
import { Line as KonvaLine } from 'react-konva';
import useHit from '../../../hooks/useHit';
const Lines: React.FC<Konva.LineConfig> = (props) => {
  const { handleMouseEnter, shapeOpacity } = useHit({ opacity: props.opacity || 1, id: props.id! });
  return (
    <KonvaLine
      points={props.points}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth! / 2}
      lineCap="round"
      lineJoin="round"
      onPointerEnter={handleMouseEnter}
      opacity={shapeOpacity}
    />
  );
};

export default React.memo(Lines);
