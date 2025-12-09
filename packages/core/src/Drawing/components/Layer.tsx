import { useMemoizedFn } from '@monorepo/common';
import Konva from 'konva';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Group,
  Layer as KonvaLayer,
  Line as KonvaLine,
  Rect as KonvaRect,
  Text as KonvaText,
  Transformer,
} from 'react-konva';
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
import { CANVAS_CONTAINER_ID } from '../../utils/drawing';
import Ellipse from './Diagram/Ellipse';
import Eraser from './Diagram/Eraser';
import Fill from './Diagram/Fill';
import Image from './Diagram/Image';
import Line from './Diagram/Lines';
import Paths from './Diagram/Paths';
import Rect from './Diagram/Rect';

type DiagramProps<T extends Diagram['type']> = DiagramPropsMap[T];

const Layer: React.FC<Layers> = (props) => {
  const { opacity, diagrams, visible, paths, eraserLines, rects, ellipses, lines, fills, image } =
    props;
  const layerRef = useRef<Konva.Layer>(null);
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const imageRef = useRef<Konva.Image>(null);
  const diagramMap = useRef<Map<string, DiagramProps<Diagram['type']>>>(new Map());

  const [guideLines, setGuideLines] = useState<{
    v: number[];
    h: number[];
    points: { x: number; y: number }[];
  }>({ v: [], h: [], points: [] });
  const snapThreshold = 2;

  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );

  const { drawingLayer, pushHistory, layers } = useLayerStore(
    useShallow((state) => ({
      drawingLayer: state.drawingLayer,
      pushHistory: state.pushHistory,
      layers: state.layers,
    }))
  );

  const { layerConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
    }))
  );

  useEffect(() => {
    if (activeKey === Actions.ROPE) {
      requestAnimationFrame(() => {
        handleBindTransformer();
      });
    }
  }, [props.image, activeKey]);

  const handleBindTransformer = useMemoizedFn(() => {
    if (drawingLayer?.id !== props.id) return;

    if (!trRef.current || !imageRef.current) return;
    trRef.current?.nodes([imageRef.current!]);
    trRef.current?.getLayer()?.batchDraw();
  });

  const handleDragStart = useMemoizedFn((e: Konva.KonvaEventObject<DragEvent>) => {
    const container = document.getElementById(CANVAS_CONTAINER_ID);
    container!.style.cursor = 'move';
    setGuideLines({ v: [], h: [], points: [] });
    handleBindTransformer();
  });

  const handleDragMove = useMemoizedFn((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    if (!node) return;

    const width = node.width() * node.scaleX();
    const height = node.height() * node.scaleY();
    const origX = node.x();
    const origY = node.y();

    const pickBestSnap = <
      T extends { curr: number; target: number; newValue: number; line: number },
    >(
      candidates: T[]
    ): T | null => {
      let best: T | null = null;
      candidates.forEach((c) => {
        const delta = Math.abs(c.curr - c.target);
        if (delta <= snapThreshold && (!best || delta < Math.abs(best.curr - best.target))) {
          best = c;
        }
      });
      return best;
    };

    const snapX = pickBestSnap([
      { curr: origX, target: 0, newValue: 0, line: 0 },
      {
        curr: origX + width / 2,
        target: layerConfig.width / 2,
        newValue: layerConfig.width / 2 - width / 2,
        line: layerConfig.width / 2,
      },
      {
        curr: origX + width,
        target: layerConfig.width,
        newValue: layerConfig.width - width,
        line: layerConfig.width,
      },
    ]);

    const snapY = pickBestSnap([
      { curr: origY, target: 0, newValue: 0, line: 0 },
      {
        curr: origY + height / 2,
        target: layerConfig.height / 2,
        newValue: layerConfig.height / 2 - height / 2,
        line: layerConfig.height / 2,
      },
      {
        curr: origY + height,
        target: layerConfig.height,
        newValue: layerConfig.height - height,
        line: layerConfig.height,
      },
    ]);

    let nextX = origX;
    let nextY = origY;
    const v: number[] = [];
    const h: number[] = [];
    const points: { x: number; y: number }[] = [];

    if (snapX) {
      nextX = snapX.newValue;
      v.push(snapX.line);
      points.push({ x: snapX.line, y: nextY + height / 2 });
    }

    if (snapY) {
      nextY = snapY.newValue;
      h.push(snapY.line);
      points.push({ x: nextX + width / 2, y: snapY.line });
    }

    node.x(nextX);
    node.y(nextY);
    setGuideLines({ v, h, points });
  });

  const handleDragEnd = useMemoizedFn((_e: unknown, rotation?: number) => {
    const node = imageRef.current;

    if (!node) return;
    const currentImage = props?.image;
    if (!currentImage) return;

    const x = node.x();
    const y = node.y();
    const width = node.width() * node.scaleX();
    const height = node.height() * node.scaleY();

    const updatedImage = {
      ...currentImage,
      x: x,
      y: y,
      width: width,
      height: height,
      rotation: rotation != undefined ? rotation : currentImage.rotation,
    };

    node.scaleX(1);
    node.scaleY(1);

    const newDrawingLayer = {
      ...props,
      image: updatedImage,
      imageFull: true,
    };

    pushHistory(
      layers.map((layer) => (layer.id !== props?.id ? layer : (newDrawingLayer as Layers)))
    );

    const container = document.getElementById(CANVAS_CONTAINER_ID);

    container!.style.cursor = '';
    setGuideLines({ v: [], h: [], points: [] });
  });

  const getDiagramProps = <T extends Diagram['type']>(
    id: string,
    type: T
  ): DiagramProps<T> | null => {
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

  const isTopLayer = useMemo(() => {
    return props.id === layers[layers.length - 1]?.id;
  }, [layers]);

  if (activeKey !== Actions.ROPE && isTopLayer) {
    return null;
  }

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
      <Group ref={groupRef} clipWidth={layerConfig.width} clipHeight={layerConfig.height}>
        {diagrams.map((diagram) => {
          const props = getDiagramProps(diagram.id, diagram.type)!;

          switch (diagram.type) {
            case 'path': {
              return <Paths key={diagram.id} {...(props as LineType)} />;
            }
            case 'image': {
              return (
                <Image
                  key={diagram.id}
                  {...(props as FillType)}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  handleBindTransformer={handleBindTransformer}
                  handleDragMove={handleDragMove}
                  ref={imageRef}
                  draggable={true}
                />
              );
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

      {guideLines.v.map((x) => (
        <KonvaLine
          key={`v-${x}`}
          points={[x, 0, x, layerConfig.height]}
          stroke="red"
          strokeWidth={1}
          dash={[6, 4]}
          listening={false}
        />
      ))}
      {guideLines.h.map((y) => (
        <KonvaLine
          key={`h-${y}`}
          points={[0, y, layerConfig.width, y]}
          stroke="red"
          strokeWidth={1}
          dash={[6, 4]}
          listening={false}
        />
      ))}
      {guideLines.points.map((p, idx) => {
        const isVertical = guideLines.v.includes(p.x);
        const isHorizontal = guideLines.h.includes(p.y);

        let textX = p.x + 4;
        let textY = p.y - 10;

        if (isHorizontal && p.y === 0) {
          textY = p.y + 4;
        }

        if (isVertical && p.x === layerConfig.width) {
          textX = p.x - 12;
        }

        return (
          <KonvaText
            key={`snap-${p.x}-${p.y}-${idx}`}
            text="x"
            x={textX}
            y={textY}
            fill="red"
            fontStyle="bold"
            fontSize={12}
            listening={false}
          />
        );
      })}

      {activeKey === Actions.ROPE && isTopLayer && (
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
          onTransformStart={handleDragStart}
          onTransformEnd={(e) => {
            const rotation = imageRef.current?.rotation();
            handleDragEnd(e, rotation === 0 ? undefined : rotation);
          }}
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
        opacity={1 - (opacity ?? 100) / 100}
      />
    </KonvaLayer>
  );
};

export default React.memo(Layer);
