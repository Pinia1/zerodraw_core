import { useMemoizedFn } from '@monorepo/common';
import Konva from 'konva';
import React, { useEffect, useRef } from 'react';
import { Group, Layer as KonvaLayer, Rect as KonvaRect, Transformer } from 'react-konva';
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
  Line as LineType,
  Rect as RectType,
} from '../../types/Layers';
import Ellipse from './Diagram/Ellipse';
import Eraser from './Diagram/Eraser';
import Fill from './Diagram/Fill';
import Line from './Diagram/Lines';
import Paths from './Diagram/Paths';
import Rect from './Diagram/Rect';

type DiagramProps<T extends Diagram['type']> = DiagramPropsMap[T];

const Layer = ({}) => {
  const rectRef = useRef<Konva.Rect>(null);
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
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
      case 'fill': {
        const props = drawingLayer?.fills.find((fill) => fill.id === id)!;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      default:
        return null;
    }
  };

  //todo 裁剪掉被擦除的透明部分
  useEffect(() => {
    if (activeKey === Actions.ROPE) {
      const group = groupRef.current;
      const rectNode = rectRef.current;

      if (!group || !rectNode) return;

      const groupRect = group.getClientRect();
      const layer = group.getLayer()!;
      const layerRect = layer.getClientRect();
      let pos: any = null;

      pos = {
        x: groupRect.x - layerRect.x,
        y: groupRect.y - layerRect.y,
        width: groupRect.width,
        height: groupRect.height,
      };
      const absPos = layer.getAbsolutePosition();
      if (pos.y <= 0) {
        pos.y = groupRect.y - absPos.y;
      }
      if (pos.x <= 0) {
        pos.x = groupRect.x - absPos.x;
      }

      rectNode.position({
        x: pos.x,
        y: pos.y,
      });
      rectNode.size({
        width: pos.width,
        height: pos.height,
      });

      trRef.current?.nodes([rectRef.current as Konva.Node]);
      trRef.current?.getLayer()?.batchDraw();
    }
  }, [activeKey]);

  return (
    <KonvaLayer
      x={layerConfig.x}
      y={layerConfig.y}
      clipWidth={layerConfig.width}
      clipHeight={layerConfig.height}
      isDrawing
    >
      <KonvaRect ref={rectRef} listening={false} fillEnabled={false} strokeEnabled={false} />

      <Group ref={groupRef}>
        {drawingLayer?.diagrams.map((diagram) => {
          const props = getDiagramProps(diagram.id, diagram.type)!;

          switch (diagram.type) {
            case 'path': {
              return <Paths key={diagram.id} {...(props as LineType)} />;
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

      {activeKey === Actions.ROPE && (
        <Transformer
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          anchorStroke={'#40d8d7'}
          borderStroke={'#40d8d7'}
          borderStrokeWidth={2}
          anchorSize={10}
          anchorCornerRadius={100}
          rotateAnchorOffset={20}
          ref={trRef}
          flipEnabled={false}
          anchorFill={'rgb(209, 249, 247)'}
          id={`transformer_selected`}
          onTouchEnd={(e) => {}}
          onTransformStart={() => {}}
          onTransformEnd={(e) => {}}
        />
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
};

export default React.memo(Layer);
