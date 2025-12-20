import { useMediaQuery } from '@zeroDraw/common';
import type Konva from 'konva';
import React from 'react';
import { Layer, Shape } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';

export const MOSIC_LAYER_ID = '__interaction_mosic_layer__';

const Mosic: React.FC = () => {
  const [windowTheme] = useMediaQuery();
  const { layerConfig, stageConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
      stageConfig: state.stageConfig,
    }))
  );

  return (
    <Layer
      x={layerConfig.x}
      y={layerConfig.y}
      clipWidth={layerConfig.width}
      clipHeight={layerConfig.height}
      listening={false}
      id={MOSIC_LAYER_ID}
    >
      <Shape
        listening={false}
        sceneFunc={(ctx, shape) => {
          const w = layerConfig.width;
          const h = layerConfig.height;
          if (w <= 0 || h <= 0) return;
          if (layerConfig.backgroundVisible) {
            ctx.save();
            ctx.fillStyle = layerConfig.backgroundColor || '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
            ctx.fillStrokeShape(shape as Konva.Shape);
            return;
          }
          const scale = Math.max(0.001, stageConfig.scale || 1);
          const dpr = Math.max(1, window.devicePixelRatio || 1);
          const tilePx = 10;
          const unitToPx = scale * dpr;
          const tile = tilePx / unitToPx;

          const shiftX = 0;
          const shiftY = 0;

          const isDark = windowTheme === 'dark';
          const c0 = isDark ? '#2c313d' : '#ffffff';
          const c1 = isDark ? '#20252e' : '#dcdbdb';

          ctx.save();
          ctx.imageSmoothingEnabled = false;

          ctx.fillStyle = c0;
          ctx.fillRect(0, 0, w + shiftX + tile, h + shiftY + tile);

          // 画交错方块
          ctx.fillStyle = c1;
          const cols = Math.ceil((w + shiftX) / tile) + 2;
          const rows = Math.ceil((h + shiftY) / tile) + 2;
          for (let row = 0; row < rows; row++) {
            const y = row * tile;
            const startCol = row % 2 === 0 ? 0 : 1;
            for (let col = startCol; col < cols; col += 2) {
              const x = col * tile;
              ctx.fillRect(x, y, tile, tile);
            }
          }
          ctx.restore();
          if (isDark) {
            return;
          }
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(252, 252, 252, 0.22)';
          ctx.fillRect(0, 0, w + shiftX + tile, h + shiftY + tile);
          ctx.fillStrokeShape(shape as Konva.Shape);
        }}
      />
    </Layer>
  );
};

export default React.memo(Mosic);
