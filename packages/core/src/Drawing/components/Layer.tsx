// 优化后的 Layer.tsx
import Konva from 'konva';
import React, { useCallback, useRef } from 'react';
import { Layer as KonvaLayer, Rect } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import useLayerStore from '../../store/useLayer';
import { pint2DToPath } from '../../utils/drawing';

interface LayerProps {}

const Layer: React.FC<LayerProps> = ({}) => {
  const ref = useRef<Konva.Layer>(null);
  const { layerConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
    }))
  );
  const { drawingLayer } = useLayerStore(
    useShallow((state) => ({
      drawingLayer: state.drawingLayer,
    }))
  );

  const renderAllPaths = useCallback((ctx: Konva.Context, path: string) => {
    ctx.imageSmoothingEnabled = false;
    const path2D = new Path2D(path);
    ctx.save();
    ctx.fill(path2D);
    ctx.restore();
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
      {drawingLayer?.lines.map((line) => (
        <Rect
          key={line.id}
          x={0}
          y={0}
          width={layerConfig.width}
          height={layerConfig.height}
          sceneFunc={(ctx) => renderAllPaths(ctx, pint2DToPath(line.points, line))}
        />
      ))}
    </KonvaLayer>
  );
};
export default React.memo(Layer);
