import React from 'react';
import { Image as KonvaImage } from 'react-konva';
import { Fill as FillType } from '../../../types/Layers';

const Fill: React.FC<FillType> = (props) => {
  return (
    <KonvaImage
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      image={props.image}
    />
  );
};

export default React.memo(Fill);
