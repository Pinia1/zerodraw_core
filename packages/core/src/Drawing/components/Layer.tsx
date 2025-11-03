import React from 'react';
import { Layer as KonvaLayer, Rect } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';

interface LayerProps {}
const Layer: React.FC<LayerProps> = () => {
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
      <Rect x={0} y={0} width={layerConfig.width} height={layerConfig.height} fill="yellow" />
    </KonvaLayer>
  );
};

export default React.memo(Layer);
