export interface RasterizeSvgOptions {
  svg: string;
  width?: number;
  height?: number;
}

export interface RasterizeSvgResult {
  dataUrl: string;
  width: number;
  height: number;
}

function parseSvgDimensions(svg: string, width?: number, height?: number): { w: number; h: number } {
  if (width && height) return { w: width, h: height };

  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  const viewBox = root.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
      return {
        w: width ?? parts[2],
        h: height ?? parts[3],
      };
    }
  }

  const attrW = parseFloat(root.getAttribute('width') ?? '');
  const attrH = parseFloat(root.getAttribute('height') ?? '');
  return {
    w: width ?? (Number.isFinite(attrW) && attrW > 0 ? attrW : 512),
    h: height ?? (Number.isFinite(attrH) && attrH > 0 ? attrH : 512),
  };
}

function normalizeSvg(svg: string): string {
  const trimmed = svg.trim();
  if (/xmlns=/.test(trimmed)) return trimmed;
  return trimmed.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
}

/** 浏览器内将 SVG 字符串栅格化为 PNG blob URL */
export async function rasterizeSvg(options: RasterizeSvgOptions): Promise<RasterizeSvgResult> {
  const { svg, width, height } = options;
  const normalized = normalizeSvg(svg);
  const doc = new DOMParser().parseFromString(normalized, 'image/svg+xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('SVG 解析失败');
  }

  const { w, h } = parseSvgDimensions(normalized, width, height);
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalized)}`;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('SVG 加载失败'));
    el.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 不可用');

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}
