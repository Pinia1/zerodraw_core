import React from 'react';
import { Layer as KonvaLayer, Path } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import testPath from '../../utils/path';

interface LayerProps {}
const Layer: React.FC<LayerProps> = ({}) => {
  const { layerConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
    }))
  );

  return (
    <KonvaLayer
      x={layerConfig.x}
      y={layerConfig.y}
      clipWidth={layerConfig.width}
      clipHeight={layerConfig.height}
    >
      {new Array(500).fill(0).map((_, index) => (
        <Path
          x={index * 10}
          y={index * 10}
          key={index}
          data={testPath}
          fill={'red'}
          listening={false}
        />
      ))}
    </KonvaLayer>
  );
};

export default React.memo(Layer);
