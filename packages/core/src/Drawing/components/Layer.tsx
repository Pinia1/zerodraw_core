import Konva from 'konva';
import React, { useRef } from 'react';
import { Group, Layer as KonvaLayer, Rect as KonvaRect } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import {
  Diagram,
  DiagramPropsMap,
  Ellipse as EllipseType,
  Fill as FillType,
  Layers,
  Line as LineType,
  Rect as RectType,
} from '../../types/Layers';
import Ellipse from './Diagram/Ellipse';
import Eraser from './Diagram/Eraser';
import Fill from './Diagram/Fill';
import Image from './Diagram/Image';
import Line from './Diagram/Lines';
import Paths from './Diagram/Paths';
import Rect from './Diagram/Rect';

type DiagramProps<T extends Diagram['type']> = DiagramPropsMap[T];

const DrawLayer: React.FC<Layers> = (props) => {
  const { opacity, diagrams, paths, eraserLines, rects, ellipses, lines, fills, image, visible } =
    props;
  const layerRef = useRef<Konva.Layer>(null);
  const groupRef = useRef<Konva.Group>(null);
  const diagramMap = useRef<Map<string, DiagramProps<Diagram['type']>>>(new Map());

  const { layerConfig, drawingId } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
      drawingId: state.drawingId,
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
        const props = paths.find((line) => line.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      case 'eraserLine': {
        const props = eraserLines.find((line) => line.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      case 'rect': {
        const props = rects.find((rect) => rect.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      case 'ellipse': {
        const props = ellipses.find((ellipse) => ellipse.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      case 'line': {
        const props = lines.find((line) => line.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      case 'fill': {
        const props = fills.find((fill) => fill.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      case 'image': {
        const props = image as FillType;
        // diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      default:
        return null;
    }
  };

  return (
    <KonvaLayer
      ref={layerRef}
      x={layerConfig.x}
      y={layerConfig.y}
      clipWidth={layerConfig.width}
      clipHeight={layerConfig.height}
      listening={visible}
      visible={visible}
      id={props.id}
    >
      <Group
        ref={groupRef}
        clipWidth={layerConfig.width}
        clipHeight={layerConfig.height}
        listening={false}
      >
        {diagrams.map((diagram) => {
          const props = getDiagramProps(diagram.id, diagram.type)!;

          switch (diagram.type) {
            case 'path': {
              return <Paths key={diagram.id} {...(props as LineType)} />;
            }
            case 'image': {
              return <Image key={diagram.id} {...(props as FillType)} />;
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
            default:
              return null;
          }
        })}
      </Group>

      <KonvaRect
        x={0}
        y={0}
        listening={false}
        width={layerConfig.width}
        height={layerConfig.height}
        id="rect_for_placeholder"
        fill={layerConfig.backgroundColor}
        globalCompositeOperation={'destination-out'}
        opacity={1 - (opacity ?? 100) / 100}
      />
    </KonvaLayer>
  );
};

export default React.memo(DrawLayer);
