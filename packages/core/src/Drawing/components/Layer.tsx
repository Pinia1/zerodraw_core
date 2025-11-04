import React from 'react';
import { Layer as KonvaLayer } from 'react-konva';
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
    ></KonvaLayer>
  );
};

export default React.memo(Layer);
