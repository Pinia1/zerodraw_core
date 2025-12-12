import type { BlendMode } from '../types/Layers';

/**
 * 将 BlendMode 转换为 Canvas globalCompositeOperation 值
 * 注意：Canvas 的混合模式名称和 CSS/Photoshop 略有不同
 */
export const blendModeToCompositeOperation = (blendMode: BlendMode = 'normal'): string => {
  const mapping: Record<BlendMode, string> = {
    normal: 'source-over', // 默认模式
    multiply: 'multiply', // 正片叠底
    screen: 'screen', // 滤色
    overlay: 'overlay', // 叠加
  };

  return mapping[blendMode] || 'source-over';
};

/**
 * 将 BlendMode 转换为 CSS mix-blend-mode 的值。
 * 说明：当你的“图层=Konva.Layer=独立 canvas”时，要实现“图层之间”的混合，应该用 CSS mix-blend-mode，
 * 而不是改 CanvasRenderingContext2D 的 globalCompositeOperation（那只对同一个 canvas 内的绘制有效）。
 */
export const blendModeToCssMixBlendMode = (blendMode: BlendMode = 'normal'): BlendMode => {
  return blendMode;
};
