import { useMemoizedFn } from '@monorepo/common';
import Konva from 'konva';
import React, { useRef } from 'react';
import { Layer as KonvaLayer } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import useLayerStore from '../../store/useLayer';
import {
  Arrow,
  Circle,
  Diagram,
  Diamond,
  Ellipse,
  Heart,
  Image,
  Line,
  Polygon,
  Rect,
  Shape,
  Star,
  Text,
  Triangle,
} from '../../types/Layers';
import Eraser from './Diagram/Eraser';
import Lines from './Diagram/Lines';

type DiagramPropsMap = {
  line: Line;
  eraserLine: Line;
  rect: Rect;
  ellipse: Ellipse;
  circle: Circle;
  triangle: Triangle;
  polygon: Polygon;
  star: Star;
  heart: Heart;
  diamond: Diamond;
  arrow: Arrow;
  text: Text;
  image: Image;
  shape: Shape;
};

type DiagramProps<T extends Diagram['type']> = DiagramPropsMap[T];

const Layer = ({}) => {
  const ref = useRef<Konva.Layer>(null);
  const diagramMap = useRef<Map<string, DiagramProps<Diagram['type']>>>(new Map());

  const { layerConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
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
    if (diagramMap.current.has(id)) {
      return diagramMap.current.get(id) as DiagramProps<T>;
    }
    switch (type) {
      case 'line': {
        const props = drawingLayer?.lines.find((line) => line.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      case 'eraserLine': {
        const props = drawingLayer?.eraserLines.find((line) => line.id === id)!;
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
        switch (diagram.type) {
          case 'line': {
            const props = getDiagramProps(diagram.id, diagram.type)!;
            return <Lines key={diagram.id} {...props} />;
          }
          case 'eraserLine': {
            const props = getDiagramProps(diagram.id, diagram.type)!;
            return <Eraser key={diagram.id} {...props} />;
          }

          default:
            return null;
        }
      })}
    </KonvaLayer>
  );
};

export default React.memo(Layer);
