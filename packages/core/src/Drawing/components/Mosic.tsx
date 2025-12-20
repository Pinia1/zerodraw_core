import { useMediaQuery } from '@zeroDraw/common';
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
            ctx.fillStrokeShape(shape as any);
            return;
          }
          const scale = Math.max(0.001, stageConfig.scale || 1);
          const dpr = Math.max(1, window.devicePixelRatio || 1);
          const tilePx = 14;
          const unitToPx = scale * dpr;
          const tile = tilePx / unitToPx;

          // 计算 layer(0,0) 在屏幕上的物理像素位置：screen = stage.x + scale*layer.x
          // 然后把绘制原点平移到 tilePx 的整数倍上，让格子边界落在整数物理像素边界。
          const originPxX = (stageConfig.x + scale * layerConfig.x) * dpr;
          const originPxY = (stageConfig.y + scale * layerConfig.y) * dpr;
          const mod = (n: number, m: number) => ((n % m) + m) % m;
          const shiftPxX = mod(originPxX, tilePx);
          const shiftPxY = mod(originPxY, tilePx);
          const shiftX = shiftPxX / unitToPx;
          const shiftY = shiftPxY / unitToPx;

          const isDark = windowTheme === 'dark';
          const c0 = isDark ? '#2B2B2D' : '#ffffff';
          const c1 = isDark ? '#1F1F21' : '#e5e5e5';

          ctx.save();
          ctx.imageSmoothingEnabled = false;

          // 平移到对齐后的坐标系
          ctx.translate(-shiftX, -shiftY);

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
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.fillRect(0, 0, w + shiftX + tile, h + shiftY + tile);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ctx.fillStrokeShape(shape as any);
        }}
      />
    </Layer>
  );
};

export default React.memo(Mosic);
