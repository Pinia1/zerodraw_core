// 优化后的 Layer.tsx
import Konva from 'konva';
import React, { useCallback, useMemo, useRef } from 'react';
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

  const path = useMemo(() => {
    const paths = drawingLayer?.lines?.map((line) => pint2DToPath(line.points, line));
    return paths?.join('');
  }, [drawingLayer?.lines]);

  const renderAllPaths = useCallback(
    (ctx: Konva.Context) => {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = 'red';

      const path2D = new Path2D(path);
      for (let i = 0; i < 10; i++) {
        ctx.save();
        ctx.translate(i * 1, i * 1);
        ctx.fill(path2D);
        ctx.restore();
      }
    },
    [path]
  );

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
