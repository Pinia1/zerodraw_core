import { cropTransparentBorder, generateUUID, useMemoizedFn } from '@monorepo/common';
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
  Layers,
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
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const diagramMap = useRef<Map<string, DiagramProps<Diagram['type']>>>(new Map());

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
  const { drawingLayer, setDrawingLayer, pushHistory } = useLayerStore(
    useShallow((state) => ({
      drawingLayer: state.drawingLayer,
      setDrawingLayer: state.setDrawingLayer,
      pushHistory: state.pushHistory,
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
      case 'image': {
        const props = drawingLayer?.image as FillType;
        diagramMap.current.set(id, props);
        return props as DiagramProps<T>;
      }
      default:
        return null;
    }
  };

  const onGroupNodeChange = async () => {
    const node = groupRef.current!;
    const groupRect = node.getClientRect();
    const layerRect = node.getLayer()!.getClientRect();

    let relativeX = 0;
    let relativeY = 0;
    let clipWidth = 0;
    let clipHeight = 0;

    let clipLeft = 0;
    let clipTop = 0;

    const targetWidth = 2560; // 或者 3840

    let pixelRatio = targetWidth / layerConfig.width / stageConfig.scale;

    pixelRatio = Math.max(1, Math.min(pixelRatio, 3));

    if (groupRect.x < layerRect.x) {
      relativeX = 0;
      clipWidth = layerRect.x - groupRect.x;
      clipLeft = layerRect.x - groupRect.x;
    } else {
      relativeX = groupRect.x - layerRect.x;
    }

    if (groupRect.x + groupRect.width > layerRect.x + layerRect.width) {
      clipWidth = groupRect.x + groupRect.width - (layerRect.x + layerRect.width);
    }

    if (groupRect.y < layerRect.y) {
      relativeY = 0;
      clipHeight = layerRect.y - groupRect.y;
      clipTop = layerRect.y - groupRect.y;
    } else {
      relativeY = groupRect.y - layerRect.y;
    }

    if (groupRect.y + groupRect.height > layerRect.y + layerRect.height) {
      clipHeight = groupRect.y + groupRect.height - (layerRect.y + layerRect.height);
    }
    const imageData = node
      .toCanvas()
      .getContext('2d')
      ?.getImageData(clipLeft, clipTop, groupRect.width - clipWidth, groupRect.height - clipHeight);

    const { bounds } = cropTransparentBorder(imageData!);

    const blob = (await node.toBlob({
      pixelRatio: pixelRatio,
      mimeType: 'image/png',
      quality: 1,
      x: Math.abs(Math.max(groupRect.x, layerRect.x) + bounds.left),
      y: Math.abs(Math.max(groupRect.y, layerRect.y) + bounds.top),
      width: Math.abs(bounds.width),
      height: Math.abs(bounds.height),
    })) as Blob;
    const dataUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.src = dataUrl;
    const image: FillType = {
      x: Math.abs((relativeX + bounds.left) / stageConfig.scale),
      y: Math.abs((relativeY + bounds.top) / stageConfig.scale),
      width: Math.abs(bounds.width / stageConfig.scale),
      height: Math.abs(bounds.height / stageConfig.scale),
      src: dataUrl,
      image: img,
      id: generateUUID(),
    };
    img.onload = () => {
      const newDrawingLayer = {
        ...drawingLayer!,
        image: image,
        lines: [],
        eraserLines: [],
        rects: [],
        ellipses: [],
        paths: [],
        fills: [],
        diagrams: [{ id: image.id, type: 'image' }],
      };
      setDrawingLayer(newDrawingLayer as Layers);
      pushHistory([newDrawingLayer as Layers]);
    };

    const pos = {
      x: Math.ceil((relativeX + bounds.left) / stageConfig.scale),
      y: Math.ceil((relativeY + bounds.top) / stageConfig.scale),
      width: Math.ceil(bounds.width / stageConfig.scale),
      height: Math.ceil(bounds.height / stageConfig.scale),
    };

    requestAnimationFrame(() => {
      trRef.current?.nodes([groupRef.current!]);
      trRef.current?.getLayer()?.batchDraw();
    });
  };

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
      <Group ref={groupRef} clipWidth={layerConfig.width} clipHeight={layerConfig.height}>
        {drawingLayer?.diagrams.map((diagram) => {
          const props = getDiagramProps(diagram.id, diagram.type)!;

          switch (diagram.type) {
            case 'path': {
              return <Paths key={diagram.id} {...(props as LineType)} />;
            }
            case 'image':
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
