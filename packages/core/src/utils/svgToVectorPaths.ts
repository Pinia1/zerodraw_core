import type { Line } from '../types/Layers';
import { generateUUID } from './drawing';

export interface SvgLayout {
  x: number;
  y: number;
  scale: number;
}

export interface ParseSvgToPathsOptions {
  svg: string;
  canvasWidth: number;
  canvasHeight: number;
  width?: number;
  height?: number;
}

export interface ParseSvgToPathsResult {
  paths: Line[];
  layout: SvgLayout;
  width: number;
  height: number;
}

function normalizeSvg(svg: string): string {
  const trimmed = svg.trim();
  if (/xmlns=/.test(trimmed)) return trimmed;
  return trimmed.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
}

function parseLength(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function computeLayout(
  svg: SVGSVGElement,
  canvasWidth: number,
  canvasHeight: number,
  width?: number,
  height?: number,
): { layout: SvgLayout; width: number; height: number } {
  const vb = svg.viewBox.baseVal;
  const srcW = width ?? (vb.width > 0 ? vb.width : parseLength(svg.getAttribute('width'), 512));
  const srcH = height ?? (vb.height > 0 ? vb.height : parseLength(svg.getAttribute('height'), 512));
  const vbX = vb.width > 0 ? vb.x : 0;
  const vbY = vb.width > 0 ? vb.y : 0;
  const scale = Math.min(canvasWidth / srcW, canvasHeight / srcH);
  const x = (canvasWidth - srcW * scale) / 2 - vbX * scale;
  const y = (canvasHeight - srcH * scale) / 2 - vbY * scale;
  return { layout: { x, y, scale }, width: srcW, height: srcH };
}

function parseOpacity(el: Element): number {
  const raw = el.getAttribute('opacity') ?? el.getAttribute('fill-opacity') ?? '1';
  const n = parseFloat(raw);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
}

function parsePaint(el: Element): { fill: boolean; stroke: string; strokeWidth: number } {
  const fillAttr = el.getAttribute('fill');
  const strokeAttr = el.getAttribute('stroke');
  const strokeWidth = parseFloat(el.getAttribute('stroke-width') ?? '1') || 1;

  if (fillAttr && fillAttr !== 'none') {
    return { fill: true, stroke: fillAttr, strokeWidth };
  }

  return {
    fill: false,
    stroke: strokeAttr && strokeAttr !== 'none' ? strokeAttr : '#000000',
    strokeWidth,
  };
}

function circleToPath(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
}

function ellipseToPath(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
}

function rectToPath(x: number, y: number, w: number, h: number, rx = 0, ry = 0): string {
  if (!rx && !ry) {
    return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
  }
  const crx = rx || ry;
  const cry = ry || rx;
  return [
    `M ${x + crx} ${y}`,
    `H ${x + w - crx}`,
    `A ${crx} ${cry} 0 0 1 ${x + w} ${y + cry}`,
    `V ${y + h - cry}`,
    `A ${crx} ${cry} 0 0 1 ${x + w - crx} ${y + h}`,
    `H ${x + crx}`,
    `A ${crx} ${cry} 0 0 1 ${x} ${y + h - cry}`,
    `V ${y + cry}`,
    `A ${crx} ${cry} 0 0 1 ${x + crx} ${y}`,
    'Z',
  ].join(' ');
}

function polyToPath(points: string, close: boolean): string {
  const nums = points
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  if (nums.length < 4) return '';
  let d = `M ${nums[0]} ${nums[1]}`;
  for (let i = 2; i < nums.length; i += 2) {
    d += ` L ${nums[i]} ${nums[i + 1]}`;
  }
  if (close) d += ' Z';
  return d;
}

function geometryToPathD(el: Element): string | null {
  const tag = el.tagName.toLowerCase();
  switch (tag) {
    case 'path': {
      const d = el.getAttribute('d')?.trim();
      return d || null;
    }
    case 'circle': {
      const cx = parseFloat(el.getAttribute('cx') ?? '0');
      const cy = parseFloat(el.getAttribute('cy') ?? '0');
      const r = parseFloat(el.getAttribute('r') ?? '0');
      return r > 0 ? circleToPath(cx, cy, r) : null;
    }
    case 'ellipse': {
      const cx = parseFloat(el.getAttribute('cx') ?? '0');
      const cy = parseFloat(el.getAttribute('cy') ?? '0');
      const rx = parseFloat(el.getAttribute('rx') ?? '0');
      const ry = parseFloat(el.getAttribute('ry') ?? '0');
      return rx > 0 && ry > 0 ? ellipseToPath(cx, cy, rx, ry) : null;
    }
    case 'rect': {
      const x = parseFloat(el.getAttribute('x') ?? '0');
      const y = parseFloat(el.getAttribute('y') ?? '0');
      const w = parseFloat(el.getAttribute('width') ?? '0');
      const h = parseFloat(el.getAttribute('height') ?? '0');
      const rx = parseFloat(el.getAttribute('rx') ?? '0');
      const ry = parseFloat(el.getAttribute('ry') ?? '0');
      return w > 0 && h > 0 ? rectToPath(x, y, w, h, rx, ry) : null;
    }
    case 'line': {
      const x1 = parseFloat(el.getAttribute('x1') ?? '0');
      const y1 = parseFloat(el.getAttribute('y1') ?? '0');
      const x2 = parseFloat(el.getAttribute('x2') ?? '0');
      const y2 = parseFloat(el.getAttribute('y2') ?? '0');
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    case 'polyline':
      return polyToPath(el.getAttribute('points') ?? '', false) || null;
    case 'polygon':
      return polyToPath(el.getAttribute('points') ?? '', true) || null;
    default:
      return null;
  }
}

function toPathBounds(
  bbox: DOMRect,
  layout: SvgLayout,
): { x: number; y: number; width: number; height: number } {
  return {
    x: bbox.x * layout.scale + layout.x,
    y: bbox.y * layout.scale + layout.y,
    width: bbox.width * layout.scale,
    height: bbox.height * layout.scale,
  };
}

function createVectorLine(
  pathD: string,
  paint: ReturnType<typeof parsePaint>,
  opacity: number,
  layout: SvgLayout,
  pathBounds: { x: number; y: number; width: number; height: number },
): Line {
  return {
    id: generateUUID(),
    points: [],
    pathD,
    pathBounds,
    layout,
    strokeWidth: paint.strokeWidth,
    stroke: paint.stroke,
    opacity,
    tension: 0,
    eraser: false,
    pressure: [],
    suppress: false,
    hardness: 1,
    stabilizer: 0,
    scale: 1,
    fill: paint.fill,
  };
}

/** 将 SVG 解析为可直接 Path2D 渲染的矢量 path 列表 */
export function parseSvgToVectorPaths(options: ParseSvgToPathsOptions): ParseSvgToPathsResult {
  const { svg, canvasWidth, canvasHeight, width, height } = options;
  const normalized = normalizeSvg(svg);
  const doc = new DOMParser().parseFromString(normalized, 'image/svg+xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('SVG 解析失败');
  }

  const svgEl = doc.documentElement as unknown as SVGSVGElement;
  const { layout, width: srcW, height: srcH } = computeLayout(
    svgEl,
    canvasWidth,
    canvasHeight,
    width,
    height,
  );

  const mount = document.createElement('div');
  mount.style.cssText = 'position:fixed;left:-10000px;top:-10000px;visibility:hidden;pointer-events:none';
  const mountedSvg = svgEl.cloneNode(true) as SVGSVGElement;
  mount.appendChild(mountedSvg);
  document.body.appendChild(mount);

  try {
    const selectors = 'path,circle,ellipse,rect,line,polyline,polygon';
    const elements = mountedSvg.querySelectorAll(selectors);
    if (!elements.length) {
      throw new Error('SVG 中未找到可转换的路径元素');
    }

    const paths: Line[] = [];
    elements.forEach((el) => {
      const pathD = geometryToPathD(el);
      if (!pathD) return;

      const geometry = el as SVGGeometryElement;
      let pathBounds = { x: 0, y: 0, width: 0, height: 0 };
      try {
        const bbox = geometry.getBBox();
        pathBounds = toPathBounds(bbox, layout);
      } catch {
        // getBBox 失败时仍保留 path，bounds 为 0
      }

      const paint = parsePaint(el);
      const opacity = parseOpacity(el);
      paths.push(createVectorLine(pathD, paint, opacity, layout, pathBounds));
    });

    if (!paths.length) {
      throw new Error('SVG 路径无效');
    }

    return { paths, layout, width: srcW, height: srcH };
  } finally {
    mount.remove();
  }
}
