import type Konva from 'konva';
import React from 'react';
import { Line as KonvaLine } from 'react-konva';

const Lines: React.FC<Konva.LineConfig> = (props) => {
  return (
    <KonvaLine
      points={props.points}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth! / 2}
      lineCap="round"
      lineJoin="round"
    />
  );
};

export default React.memo(Lines);
