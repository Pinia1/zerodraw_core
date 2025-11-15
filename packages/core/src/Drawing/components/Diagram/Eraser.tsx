import React from 'react';
import { Line as EraserLine } from 'react-konva';
import type { Line } from '../../../types/Layers';

const Eraser: React.FC<Line> = (props) => {
  return (
    <EraserLine
      globalCompositeOperation={'destination-out'}
      lineCap={'round'}
      lineJoin={'round'}
      listening={false}
      strokeWidth={props.strokeWidth! / Math.round(props.scale)}
      stroke={props.stroke}
      opacity={props.opacity}
      points={props.points}
    />
  );
};

export default React.memo(Eraser);
