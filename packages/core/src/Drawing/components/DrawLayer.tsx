import Konva from 'konva';
import React, { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { Group, Layer as KonvaLayer, Rect as KonvaRect } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import useLayerStore from '../../store/useLayer';
import useToolsStore from '../../store/useTools';
import { Actions } from '../../types/Drawing';
import {
  Diagram,
  DiagramPropsMap,
  Ellipse as EllipseType,
  Fill as FillType,
  Lasso as LassoType,
  Line as LineType,
  Rect as RectType,
} from '../../types/Layers';
import { layerFilterToCssFilter } from '../../utils/BlendMode';
import type { ActiveDiagramState } from './ActiveDiagram';
import Ellipse from './Diagram/Ellipse';
import Eraser from './Diagram/Eraser';
import EraserLasso from './Diagram/EraserLasso';
import Fill from './Diagram/Fill';
import Image from './Diagram/Image';
import Lasso from './Diagram/Lasso';
import Line from './Diagram/Lines';
import Paths from './Diagram/Paths';
import Rect from './Diagram/Rect';

export interface DrawLayerRef {
  setMirrorActiveDiagram: React.Dispatch<React.SetStateAction<ActiveDiagramState | null>>;
}

type DiagramProps<T extends Diagram['type']> = DiagramPropsMap[T];

interface DrawLayerProps {
  activeDiagram?: ActiveDiagramState | null;
}

const DrawLayer = React.forwardRef<DrawLayerRef, DrawLayerProps>(({ activeDiagram }, ref) => {
  const [mirrorActiveDiagram, setMirrorActiveDiagram] = useState<ActiveDiagramState | null>(null);

  useImperativeHandle(ref, () => ({ setMirrorActiveDiagram }), []);
  const layerRef = useRef<Konva.Layer>(null);
  const groupRef = useRef<Konva.Group>(null);
  const diagramMap = useRef<Map<string, DiagramProps<Diagram['type']>>>(new Map());

  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );

  const { layerConfig, drawingId } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
      drawingId: state.drawingId,
    }))
  );

  const { drawingLayer } = useLayerStore(
    useShallow((state) => ({
      drawingLayer: state.drawingLayer,
    }))
  );

  const getDiagramProps = <T extends Diagram['type']>(
    id: string,
    type: T
  ): DiagramProps<T> | null => {
    if (diagramMap.current.has(id) && drawingId !== id) {
      return diagramMap.current.get(id) as DiagramProps<T>;
    }
    switch (type) {
      case 'path': {
        const props = drawingLayer?.paths.find((line) => line.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      case 'lasso': {
        const props = drawingLayer?.lassos.find((lasso) => lasso.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      case 'eraseLasso': {
        const props = drawingLayer?.eraseLassos.find((eraseLasso) => eraseLasso.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      case 'eraserLine': {
        const props = drawingLayer?.eraserLines.find((line) => line.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      case 'rect': {
        const props = drawingLayer?.rects.find((rect) => rect.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      case 'ellipse': {
        const props = drawingLayer?.ellipses.find((ellipse) => ellipse.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      case 'line': {
        const props = drawingLayer?.lines.find((line) => line.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      case 'fill': {
        const props = drawingLayer?.fills.find((fill) => fill.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      case 'image': {
        const props = drawingLayer?.image as FillType;
        // diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      default:
        return null;
    }
  };

  // 设置“图层之间”的混合模式：使用 CSS mix-blend-mode 作用于 Layer 的 canvas 元素
  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer || !drawingLayer) return;

    try {
      const canvasEl = (layer.getCanvas() as any)?._canvas as HTMLCanvasElement | undefined;
      if (!canvasEl) return;

      canvasEl.style.mixBlendMode = drawingLayer.blendMode;
      canvasEl.style.filter = layerFilterToCssFilter(drawingLayer.filter);
    } catch (error) {
      console.warn('Failed to set css mix-blend-mode for DrawLayer canvas:', error);
    }
  }, [drawingLayer?.blendMode, drawingLayer?.filter, activeKey]);

  if (activeKey === Actions.ROPE) {
    return null;
  }

  return (
    <KonvaLayer
      ref={layerRef}
      x={layerConfig.x}
      y={layerConfig.y}
      clipWidth={layerConfig.width}
      clipHeight={layerConfig.height}
      isDrawing
      id={drawingLayer?.id}
      visible={drawingLayer?.visible}
    >
      <Group ref={groupRef} clipWidth={layerConfig.width} clipHeight={layerConfig.height}>
        {drawingLayer?.diagrams.map((diagram) => {
          const props = getDiagramProps(diagram.id, diagram.type)!;

          switch (diagram.type) {
            case 'path': {
              return <Paths key={diagram.id} {...(props as LineType)} />;
            }
            case 'image': {
              return <Image key={diagram.id} {...(props as FillType)} draggable={false} />;
            }

            case 'fill': {
              return <Fill key={diagram.id} {...(props as FillType)} />;
            }
            case 'eraserLine': {
              return <Eraser key={diagram.id} {...(props as LineType)} />;
            }
            case 'rect': {
              return <Rect key={diagram.id} {...(props as RectType)} />;
            }
            case 'ellipse': {
              return <Ellipse key={diagram.id} {...(props as EllipseType)} />;
            }
            case 'line': {
              return <Line key={diagram.id} {...(props as Konva.LineConfig)} />;
            }

            case 'eraseLasso': {
              return <EraserLasso key={diagram.id} {...(props as LassoType)} />;
            }
            default:
              return null;
          }
        })}
      </Group>
      {activeKey === Actions.LASSO &&
        drawingLayer?.lassos.map((lasso) => {
          return <Lasso key={lasso.id} {...lasso} />;
        })}
      {activeKey === Actions.ERASER && activeDiagram?.type === 'eraserLine' && (
        <Eraser {...(activeDiagram.props as LineType)} />
      )}
      {activeKey === Actions.ERASER && mirrorActiveDiagram?.type === 'eraserLine' && (
        <Eraser {...(mirrorActiveDiagram.props as LineType)} />
      )}

      <KonvaRect
        x={0}
        y={0}
        listening={false}
        width={layerConfig.width}
        height={layerConfig.height}
        id="rect_for_placeholder"
        fill={layerConfig.backgroundColor}
        globalCompositeOperation={'destination-out'}
        opacity={1 - (drawingLayer?.opacity ?? 100) / 100}
      />
    </KonvaLayer>
  );
});

export default React.memo(DrawLayer);
