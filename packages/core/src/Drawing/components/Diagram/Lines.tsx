import React from 'react';
import { Line as KonvaLine } from 'react-konva';
import type { Line } from '../../../types/Layers';

const Lines: React.FC<Line> = (props) => {
  return (
    <KonvaLine
      points={props.points}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth / 2}
      lineCap="round"
      lineJoin="round"
    />
  );
};

export default React.memo(Lines);
