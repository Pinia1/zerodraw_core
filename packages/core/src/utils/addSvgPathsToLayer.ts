import { useDrawingStore } from '../store/useDrawing';
import useLayerStore, { initialDrawingLayer } from '../store/useLayer';
import type { Layers, Line } from '../types/Layers';
import { parseSvgToVectorPaths } from './svgToVectorPaths';

function findNextLayerOrder(layers: Layers[]): number {
  if (!layers.length) return 1;
  const sorted = [...layers].sort((a, b) => a.order - b.order);
  return sorted[sorted.length - 1].order + 1;
}

export interface AddSvgPathsToLayerOptions {
  svg: string;
  width?: number;
  height?: number;
  name?: string;
}

export interface AddSvgPathsToLayerResult {
  layerId: string;
  pathCount: number;
  width: number;
  height: number;
}

/** 将 SVG 解析为矢量 path 并写入新图层（Path2D 渲染，非栅格化） */
export function addSvgPathsToLayer(
  options: AddSvgPathsToLayerOptions,
): AddSvgPathsToLayerResult {
  const { layerConfig } = useDrawingStore.getState();
  const { layers, setDrawingLayer, pushHistory } = useLayerStore.getState();

  const parsed = parseSvgToVectorPaths({
    svg: options.svg,
    canvasWidth: layerConfig.width,
    canvasHeight: layerConfig.height,
    width: options.width,
    height: options.height,
  });

  const order = findNextLayerOrder(layers);
  const pathLines: Line[] = parsed.paths;
  const newLayer: Layers = {
    ...initialDrawingLayer(),
    name: options.name ?? `Layer ${order + 1}`,
    order,
    paths: pathLines,
    diagrams: pathLines.map((line) => ({ id: line.id, type: 'path' as const })),
  };

  setDrawingLayer(newLayer);
  pushHistory([...layers, newLayer]);

  return {
    layerId: newLayer.id,
    pathCount: pathLines.length,
    width: parsed.width,
    height: parsed.height,
  };
}
