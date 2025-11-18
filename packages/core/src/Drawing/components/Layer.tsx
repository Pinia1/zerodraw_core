import { useMemoizedFn } from '@monorepo/common';
import Konva from 'konva';
import React, { useRef } from 'react';
import { Layer as KonvaLayer } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import useLayerStore from '../../store/useLayer';
import {
  Diagram,
  DiagramPropsMap,
  Ellipse as EllipseType,
  Line as LineType,
  Rect as RectType,
} from '../../types/Layers';
import Ellipse from './Diagram/Ellipse';
import Eraser from './Diagram/Eraser';
import Line from './Diagram/Lines';
import Paths from './Diagram/Paths';
import Rect from './Diagram/Rect';

type DiagramProps<T extends Diagram['type']> = DiagramPropsMap[T];

const Layer = ({}) => {
  const ref = useRef<Konva.Layer>(null);
  const diagramMap = useRef<Map<string, DiagramProps<Diagram['type']>>>(new Map());

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

  //切换drawing layer时，拉伸变化时
  const clearCache = useMemoizedFn(() => {
    diagramMap.current.clear();
  });

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
      default:
        return null;
    }
  };

  return (
    <KonvaLayer
      x={layerConfig.x}
      y={layerConfig.y}
      clipWidth={layerConfig.width}
      clipHeight={layerConfig.height}
      ref={ref}
      listening
    >
      {drawingLayer?.diagrams.map((diagram) => {
        const props = getDiagramProps(diagram.id, diagram.type)!;

        switch (diagram.type) {
          case 'path': {
            return <Paths key={diagram.id} {...(props as LineType)} />;
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
            return <Line key={diagram.id} {...(props as any)} />;
          }
          default:
            return null;
        }
      })}
    </KonvaLayer>
  );
};

export default React.memo(Layer);
