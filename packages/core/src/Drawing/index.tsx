import { useMount } from '@monorepo/common';
import React from 'react';
import { Stage } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import type { DrawingProps } from '..';
import useBindStageRef from '../hooks/useBindRef';
import { useDrawingStore } from '../store/useDrawing';
import { ASIDE_WIDTH, PROMPT_WIDTH, RATIO } from '../utils/drawing';
import Layer from './components/Layer';

const Drawing: React.FC<DrawingProps> = (props) => {
  const { size } = props;
  const stageRef = useBindStageRef();
  const { stageConfig, setLayerConfig } = useDrawingStore(
    useShallow((state) => ({
      stageConfig: state.stageConfig,
      setStageConfig: state.setStageConfig,
      setLayerConfig: state.setLayerConfig,
    }))
  );

  const init = () => {
    const width = size.width - PROMPT_WIDTH - 80 - ASIDE_WIDTH;
    const height = width / RATIO;
    setLayerConfig({
      width,
      height,
      x: (size.width - PROMPT_WIDTH - width + ASIDE_WIDTH) / 2,
      y: (size.height - height) / 2,
    });
  };

  useMount(() => {
    init();
  });

  return (
    <Stage
      ref={stageRef}
      style={{}}
      width={size.width}
      height={size.height}
      x={stageConfig.x}
      y={stageConfig.y}
      scaleX={stageConfig.scale}
      scaleY={stageConfig.scale}
    >
      <Layer />
    </Stage>
  );
};
export default Drawing;
