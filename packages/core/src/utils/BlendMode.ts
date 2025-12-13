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
    /** 导出目标宽度（像素）。不传则默认 1920，并按比例计算高度 */
    targetWidth?: number;
    /** 指定导出背景色；不传则尝试从 stage 内的 `#rect_for_placeholder` 读取 fill */
    backgroundColor?: string;
    /**
     * 是否把当前视图的 stage 平移/缩放（`stageConfig`）也烘焙进导出。
     * - false（默认）：导出“画布内容”（不受当前缩放/拖拽影响）
     * - true：导出“所见即所得视口效果”（受缩放/拖拽影响）
     */
    applyStageTransform?: boolean;
    /** stageConfig.scale（仅 applyStageTransform=true 时生效） */
    stageScale?: number;
    /** stageConfig.x（仅 applyStageTransform=true 时生效） */
    stageX?: number;
    /** stageConfig.y（仅 applyStageTransform=true 时生效） */
    stageY?: number;
    pixelRatio?: number;
    mimeType?: string;
    quality?: number;
    /** 裁剪区域（相对“视口 stage canvas”坐标）。建议使用 cropX/cropY，避免与 stageX/stageY 混淆 */
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

  // 裁剪区域：优先使用 cropX/cropY，避免和 stageX/stageY 冲突
  const srcX = cropX ?? x ?? 0;
  const srcY = cropY ?? y ?? 0;
  const srcW = cropWidth ?? width ?? stage.width();
  const srcH = cropHeight ?? height ?? stage.height();

  // 1) 计算导出分辨率：默认导出宽度固定 1920，等比缩放高度
  const scale = pixelRatioFromCaller ?? targetWidth / srcW;
  const outWidth = pixelRatioFromCaller ? Math.round(srcW * scale) : targetWidth;
  const outHeight = Math.max(1, Math.round(srcH * scale));

  // 2) 创建最终导出 canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = outWidth;
  outCanvas.height = outHeight;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return '';
  outCtx.setTransform(scale, 0, 0, scale, 0, 0);

  // 3) 背景色：优先用传入的 backgroundColor，否则尝试从 Konva 节点读取
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

  // 4) 离屏构建一个 1:1 的 Stage，把当前可见的 Konva.Layer 克隆进去（避免视图缩放/平移影响导出）
  const offscreenContainer = document.createElement('div');
  // 注意：每个 Konva.Layer 的内部 canvas 尺寸跟 Stage 尺寸一致。
  // 你的业务里图层内容是以 `layerConfig.x/y` 偏移放在“视口 stage”中间的，所以离屏 stage 必须跟原 stage 同尺寸，
  // 否则 layerCanvas 的裁剪 (x,y,width,height) 会失效或错位。
  const viewportW = stage.width();
  const viewportH = stage.height();
  const offscreenStage = new Konva.Stage({
    container: offscreenContainer,
    width: viewportW,
    height: viewportH,
  });

  if (applyStageTransform) {
    // 复刻视图 transform，让离屏 stage 的各 layer canvas 像素与“你看到的”一致
    offscreenStage.scale({ x: stageScale, y: stageScale });
    offscreenStage.position({ x: stageX, y: stageY });
  }

  const stageLayers = stage.getLayers();

  // 按 order 从底到顶（order 越小越底）合成
  const sorted = [...layers].filter((l) => l.visible !== false).sort((a, b) => a.order - b.order);

  // 先把所有要导出的 layer 克隆到离屏 stage
  for (const layer of sorted) {
    const liveLayer = stageLayers.find((l) => l?.attrs?.id === layer.id) as any;
    if (!liveLayer) continue;
    const cloned = liveLayer.clone({ listening: false });
    offscreenStage.add(cloned);
  }

  offscreenStage.draw();

  // 5) 逐层取出离屏 layer 的 canvas，按混合模式合成到 outCanvas
  for (let i = 0; i < sorted.length; i++) {
    const layer = sorted[i];
    const offLayer = offscreenStage
      .getLayers()
      .find((l) => (l as any)?.attrs?.id === layer.id) as any;
    if (!offLayer) continue;

    // Konva 内部 scene canvas：offLayer.getCanvas()._canvas 是 HTMLCanvasElement
    const layerCanvasEl = (offLayer.getCanvas() as any)?._canvas as HTMLCanvasElement | undefined;
    if (!layerCanvasEl) continue;

    // 关键：Konva 的 scene canvas 往往会按 devicePixelRatio 放大（例如 2x），
    // drawImage 的 source 区域坐标必须使用“物理像素”坐标系。
    // 这里用 canvas 实际像素尺寸 / 视口尺寸 推算像素比，避免依赖私有 API。
    const canvasScaleX = viewportW ? layerCanvasEl.width / viewportW : 1;
    const canvasScaleY = viewportH ? layerCanvasEl.height / viewportH : 1;

    const sx = srcX * canvasScaleX;
    const sy = srcY * canvasScaleY;
    const sWidth = srcW * canvasScaleX;
    const sHeight = srcH * canvasScaleY;

    // 如果没有背景（透明）且这是第一层，强制用 source-over，避免某些 blend mode 在透明底上出现异常结果
    const composite =
      !hasBackdrop && i === 0 ? 'source-over' : blendModeToCompositeOperation(layer.blendMode);
    outCtx.save();
    outCtx.globalCompositeOperation = composite as any;

    // 导出阶段烘焙 filter：使用 CanvasRenderingContext2D.filter
    // 注意：这里是对整层 canvas 应用滤镜，语义与 UI 的 CSS filter（对 layer canvas DOM）一致。
    outCtx.filter = layerFilterToCssFilter(layer.filter);

    /**
     * 重要：你的图层透明度不是通过 `Konva.Layer.opacity` 实现，而是用一个全屏 `destination-out` Rect 把 alpha “挖掉”。
     * 因此 layerCanvas 像素本身已经包含了“opacity”效果，这里如果再乘一次 `globalAlpha` 会导致透明度被叠加（变得更透明）。
     */
    outCtx.globalAlpha = 1;

    // 从 layerCanvas 裁剪出导出区域，绘制到输出 (0,0,srcW,srcH)
    // 如果 applyStageTransform=true，srcX/srcY/srcW/srcH 仍然以“视口 stage canvas 坐标”裁剪（与原来 stage.toDataURL 行为一致）。
    outCtx.drawImage(layerCanvasEl, sx, sy, sWidth, sHeight, 0, 0, srcW, srcH);
    outCtx.restore();
  }

  offscreenStage.destroy();

  return outCanvas.toDataURL(mimeType, quality);
};
