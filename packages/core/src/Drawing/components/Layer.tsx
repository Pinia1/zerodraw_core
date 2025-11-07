// 优化后的 Layer.tsx
import Konva from 'konva';
import React, { useCallback, useRef } from 'react';
import { Group, Layer as KonvaLayer, Rect } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import testPath from '../../utils/path';

interface LayerProps {}

const Layer: React.FC<LayerProps> = ({}) => {
  const ref = useRef<Konva.Layer>(null);
  const { layerConfig, stageConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
      stageConfig: state.stageConfig,
    }))
  );

  // 使用单个 sceneFunc 绘制所有内容，而不是 100 个 Path 组件
  const renderAllPaths = useCallback((ctx: Konva.Context) => {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'red';

    const path2D = new Path2D(testPath);
    for (let i = 0; i < 1000; i++) {
      ctx.save();
      ctx.translate(i * 1, i * 1);
      ctx.fill(path2D);
      ctx.restore();
    }

    setTimeout(() => {
      handleCache();
    }, 16);
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
    >
      <Group>
        <Rect
          x={0}
          y={0}
          width={layerConfig.width}
          height={layerConfig.height}
          sceneFunc={renderAllPaths}
        />
      </Group>
    </KonvaLayer>
  );
};
export default React.memo(Layer);
