import React from 'react';
import { Stage } from 'react-konva';
import type { DrawingProps } from '..';
import useBindStageRef from '../hooks/useBindRef';

const Drawing: React.FC<DrawingProps> = (props) => {
  const { size } = props;
  const stageRef = useBindStageRef();
  return <Stage ref={stageRef} style={{}} width={size.width} height={size.height}></Stage>;
};
export default Drawing;
