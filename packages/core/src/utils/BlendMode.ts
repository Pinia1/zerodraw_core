import type { BlendMode } from '../types/Layers';

import Konva from 'konva';
import type { Layers } from '../types/Layers';

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
    'color-dodge': 'color-dodge', // 颜色减淡
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

/**
 * 导出 Stage，应用所有图层的混合模式和透明度
 * @param stage Konva Stage 实例
 * @param layers 图层数组（需要包含 blendMode 和 opacity）
 * @param options 导出选项
 */
export const exportStageWithBlendModes = async (
  stage: Konva.Stage,
  layers: Layers[],
  options: {
    pixelRatio?: number;
    mimeType?: string;
    quality?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  } = {}
): Promise<string> => {
  const {
    pixelRatio = 1,
    mimeType = 'image/png',
    quality = 1,
    x = 0,
    y = 0,
    width = stage.width(),
    height = stage.height(),
  } = options;

  // 创建离屏 Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  const ctx = canvas.getContext('2d')!;

  // 缩放 context 以支持高分辨率
  ctx.scale(pixelRatio, pixelRatio);

  // 按 order 排序图层（从底层到顶层）
  const sortedLayers = [...layers]
    .filter((layer) => layer.visible) // 只处理可见图层
    .sort((a, b) => a.order - b.order);

  // 依次绘制每个图层
  for (const layer of sortedLayers) {
    // 获取图层节点
    const layerNode = stage.findOne(`#${layer.id}`) as Konva.Layer | null;
    if (!layerNode) continue;

    // 创建离屏 Stage 来渲染单个图层
    const offscreenContainer = document.createElement('div');
    const offscreenStage = new Konva.Stage({
      container: offscreenContainer,
      width: width,
      height: height,
    });

    // 克隆图层
    const clonedLayer = layerNode.clone({ listening: false });
    offscreenStage.add(clonedLayer);

    // 将图层渲染到 Canvas
    const layerCanvas = offscreenStage.toCanvas({
      pixelRatio: 1,
      x: x,
      y: y,
      width: width,
      height: height,
    });

    // 设置混合模式
    const compositeOp = blendModeToCompositeOperation(layer.blendMode);
    ctx.globalCompositeOperation = compositeOp as GlobalCompositeOperation;

    // 设置透明度
    ctx.globalAlpha = layer.opacity / 100;

    // 绘制图层
    ctx.drawImage(layerCanvas, x, y, width, height);

    // 清理离屏资源
    offscreenStage.destroy();
  }

  // 返回 dataURL
  return canvas.toDataURL(mimeType, quality);
};
