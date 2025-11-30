import React from 'react';
import { Image as KonvaImage } from 'react-konva';
import { Fill as FillType } from '../../../types/Layers';

const Image: React.FC<FillType> = (props) => {
  return (
    <KonvaImage
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      image={props.img}
    />
  );
};

export default React.memo(Image);
