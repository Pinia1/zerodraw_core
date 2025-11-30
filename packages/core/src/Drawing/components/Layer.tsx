import { cropTransparentBorder, useMemoizedFn } from '@monorepo/common';
import Konva from 'konva';
import React, { useEffect, useRef, useState } from 'react';
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

  const [transformerPos, setTransformerPos] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );

  const { layerConfig, drawingId, stageConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
      drawingId: state.drawingId,
      stageConfig: state.stageConfig,
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

  const onGroupNodeChange = useMemoizedFn(() => {
    const node = groupRef.current;
    const rectNode = rectRef.current;
    if (!node || !rectNode || !drawingLayer?.diagrams.length) return;

    const groupRect = node.getClientRect();
    const layer = node.getLayer();
    if (!layer) return;

    const layerRect = layer.getClientRect();

    if (groupRect.width <= 0 || groupRect.height <= 0) return;

    const interLeft = Math.max(groupRect.x, layerRect.x);
    const interTop = Math.max(groupRect.y, layerRect.y);
    const interRight = Math.min(groupRect.x + groupRect.width, layerRect.x + layerRect.width);
    const interBottom = Math.min(groupRect.y + groupRect.height, layerRect.y + layerRect.height);

    const interWidth = interRight - interLeft;
    const interHeight = interBottom - interTop;

    // 无交集直接返回
    if (interWidth <= 0 || interHeight <= 0) return;

    const pixelRatio = 0.1;

    const canvas = node.toCanvas({
      x: interLeft,
      y: interTop,
      width: interWidth,
      height: interHeight,
      pixelRatio,
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const { bounds } = cropTransparentBorder(imageData);

    // 把 bounds 从采样坐标系 + layer 绝对坐标，转换回 layer 局部坐标，再除以缩放
    const scale = stageConfig.scale || 1;
    const xInLayer = (interLeft + bounds.left / pixelRatio - layerRect.x) / scale;
    const yInLayer = (interTop + bounds.top / pixelRatio - layerRect.y) / scale;
    const wInLayer = bounds.width / pixelRatio / scale;
    const hInLayer = bounds.height / pixelRatio / scale;

    if (wInLayer <= 0 || hInLayer <= 0) return;

    setTransformerPos({
      x: xInLayer,
      y: yInLayer,
      width: wInLayer,
      height: hInLayer,
    });

    trRef.current?.nodes([rectNode]);
    trRef.current?.getLayer()?.batchDraw();
  });

  useEffect(() => {
    if (activeKey === Actions.ROPE) {
      onGroupNodeChange();
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
      <KonvaRect
        ref={rectRef}
        listening={false}
        fillEnabled={false}
        strokeEnabled={false}
        {...transformerPos}
      />

      <Group ref={groupRef} clipWidth={layerConfig.width} clipHeight={layerConfig.height}>
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
