// 优化后的 Layer.tsx
import Konva from 'konva';
import React, { useCallback, useRef } from 'react';
import { Layer as KonvaLayer, Rect } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import testPath from '../../utils/path';

interface LayerProps {}

const Layer: React.FC<LayerProps> = ({}) => {
  const ref = useRef<Konva.Layer>(null);
  const { layerConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
    }))
  );

  const renderAllPaths = useCallback((ctx: Konva.Context) => {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'red';

    const path2D = new Path2D(testPath);
    for (let i = 0; i < 10; i++) {
      ctx.save();
      ctx.translate(i * 1, i * 1);
      ctx.fill(path2D);
      ctx.restore();
    }
  }, []);

  const handleCache = () => {
    if (!ref.current?.isCached()) {
      ref.current?.cache();
    }
  };

  return (
    <KonvaLayer
      x={layerConfig.x}
      y={layerConfig.y}
      clipWidth={layerConfig.width}
      clipHeight={layerConfig.height}
      ref={ref}
      listening
    >
      <Rect
        onMouseDown={(e) => {
          console.log('?');
        }}
        listening
        x={0}
        y={0}
        width={layerConfig.width}
        height={layerConfig.height}
        sceneFunc={renderAllPaths}
      />
    </KonvaLayer>
  );
};
export default React.memo(Layer);
