import React from 'react';
import { Layer, Rect, Stage } from 'react-konva';
import type { DrawingProps } from '..';

const Drawing: React.FC<DrawingProps> = (props) => {
  const { size } = props;

  return (
    <Stage width={size.width} height={size.height}>
      <Layer>
        <Rect width={size.width} height={size.height} fill="red" />
      </Layer>
    </Stage>
  );
};
export default Drawing;
