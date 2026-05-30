import type { BlendMode, LayerFilter } from '../types/Layers';

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

const DEFAULT_FILTER: Required<LayerFilter> = {
  blur: 0,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hueRotate: 0,
  sepia: 0,
  grayscale: 0,
  invert: 0,
};

const normalizeFilter = (filter?: LayerFilter): Required<LayerFilter> => {
  return { ...DEFAULT_FILTER, ...(filter ?? {}) };
};

/**
 * 将 LayerFilter 转成 CSS filter 字符串（用于 UI 渲染阶段）。
 * 返回 'none' 表示不应用滤镜。
 */
export const layerFilterToCssFilter = (filter?: LayerFilter): string => {
  const f = normalizeFilter(filter);
  const isDefault =
    f.blur === 0 &&
    f.brightness === 100 &&
    f.contrast === 100 &&
    f.saturate === 100 &&
    f.hueRotate === 0 &&
    f.sepia === 0 &&
    f.grayscale === 0 &&
    f.invert === 0;

  if (isDefault) return 'none';

  return [
    `blur(${f.blur}px)`,
    `brightness(${f.brightness}%)`,
    `contrast(${f.contrast}%)`,
    `saturate(${f.saturate}%)`,
    `hue-rotate(${f.hueRotate}deg)`,
    `sepia(${f.sepia}%)`,
    `grayscale(${f.grayscale}%)`,
    `invert(${f.invert}%)`,
  ].join(' ');
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
    targetWidth?: number;
    backgroundColor?: string;
    applyStageTransform?: boolean;
    stageScale?: number;
    stageX?: number;
    stageY?: number;
    pixelRatio?: number;
    mimeType?: string;
    quality?: number;
    x?: number; // backward-compatible
    y?: number; // backward-compatible
    width?: number; // backward-compatible
    height?: number; // backward-compatible
    cropX?: number;
    cropY?: number;
    cropWidth?: number;
    cropHeight?: number;
  } = {}
): Promise<string> => {
  const {
    targetWidth = 1920,
    backgroundColor,
    applyStageTransform = false,
    stageScale = 1,
    stageX = 0,
    stageY = 0,
    pixelRatio: pixelRatioFromCaller,
    mimeType = 'image/png',
    quality = 1,
    x = 0,
    y = 0,
    width = stage.width(),
    height = stage.height(),
    cropX,
    cropY,
    cropWidth,
    cropHeight,
  } = options;

  const srcX = cropX ?? x ?? 0;
  const srcY = cropY ?? y ?? 0;
  const srcW = cropWidth ?? width ?? stage.width();
  const srcH = cropHeight ?? height ?? stage.height();

  const scale = pixelRatioFromCaller ?? targetWidth / srcW;
  const outWidth = pixelRatioFromCaller ? Math.round(srcW * scale) : targetWidth;
  const outHeight = Math.max(1, Math.round(srcH * scale));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outWidth;
  outCanvas.height = outHeight;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return '';
  outCtx.setTransform(scale, 0, 0, scale, 0, 0);

  let bg = backgroundColor;
  if (!bg) {
    try {
      const rect = stage.findOne('#rect_for_placeholder') as any;
      bg =
        (typeof rect?.fill === 'function' ? rect.fill() : undefined) ??
        (typeof rect?.attrs?.fill === 'string' ? rect.attrs.fill : undefined);
    } catch {
      // ignore
    }
  }
  if (bg && bg !== 'transparent') {
    outCtx.save();
    outCtx.globalCompositeOperation = 'source-over';
    outCtx.globalAlpha = 1;
    outCtx.fillStyle = bg;
    outCtx.fillRect(0, 0, srcW, srcH);
    outCtx.restore();
  } else {
    outCtx.clearRect(0, 0, srcW, srcH);
  }
  const hasBackdrop = !!(bg && bg !== 'transparent');

  const offscreenContainer = document.createElement('div');
  const viewportW = Math.max(stage.width(), srcX + srcW);
  const viewportH = Math.max(stage.height(), srcY + srcH);
  const offscreenStage = new Konva.Stage({
    container: offscreenContainer,
    width: viewportW,
    height: viewportH,
  });

  if (applyStageTransform) {
    offscreenStage.scale({ x: stageScale, y: stageScale });
    offscreenStage.position({ x: stageX, y: stageY });
  }

  const stageLayers = stage.getLayers();

  const sorted = [...layers].filter((l) => l.visible !== false).sort((a, b) => a.order - b.order);

  for (const layer of sorted) {
    const liveLayer = stageLayers.find((l) => l?.attrs?.id === layer.id) as any;
    if (!liveLayer) continue;
    const cloned = liveLayer.clone({ listening: false });
    offscreenStage.add(cloned);
  }

  offscreenStage.draw();

  for (let i = 0; i < sorted.length; i++) {
    const layer = sorted[i];
    const offLayer = offscreenStage
      .getLayers()
      .find((l) => (l as any)?.attrs?.id === layer.id) as any;
    if (!offLayer) continue;

    const layerCanvasEl = (offLayer.getCanvas() as any)?._canvas as HTMLCanvasElement | undefined;
    if (!layerCanvasEl) continue;

    const canvasScaleX = viewportW ? layerCanvasEl.width / viewportW : 1;
    const canvasScaleY = viewportH ? layerCanvasEl.height / viewportH : 1;

    const sx = srcX * canvasScaleX;
    const sy = srcY * canvasScaleY;
    const sWidth = srcW * canvasScaleX;
    const sHeight = srcH * canvasScaleY;

    const composite =
      !hasBackdrop && i === 0 ? 'source-over' : blendModeToCompositeOperation(layer.blendMode);
    outCtx.save();
    outCtx.globalCompositeOperation = composite as any;

    outCtx.filter = layerFilterToCssFilter(layer.filter);

    outCtx.globalAlpha = 1;

    outCtx.drawImage(layerCanvasEl, sx, sy, sWidth, sHeight, 0, 0, srcW, srcH);
    outCtx.restore();
  }

  offscreenStage.destroy();

  return outCanvas.toDataURL(mimeType, quality);
};
