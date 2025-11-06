// 优化后的 Layer.tsx
import Konva from 'konva';
import { Layer as KonvaLayerType } from 'konva/lib/Layer';
import React, { useCallback, useRef } from 'react';
import { Group, Layer as KonvaLayer, Rect } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import testPath from '../../utils/path';

interface LayerProps {}

const Layer: React.FC<LayerProps> = ({}) => {
  const ref = useRef<KonvaLayerType | null>(null);
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
    for (let i = 0; i < 500; i++) {
      ctx.save();
      ctx.translate(i * 10, 0);
      ctx.fill(path2D);
      ctx.restore();
    }
  }, []);

  return (
    <KonvaLayer
      x={layerConfig.x}
      y={layerConfig.y}
      clipWidth={layerConfig.width}
      clipHeight={layerConfig.height}
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
