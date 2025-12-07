import { cropTransparentBorder, generateUUID, useMemoizedFn } from '@monorepo/common';
import Konva from 'konva';
import React, { useEffect, useRef, useState } from 'react';
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
import imageManager from '../../utils/imageManager';
import Ellipse from './Diagram/Ellipse';
import Eraser from './Diagram/Eraser';
import Fill from './Diagram/Fill';
import Image from './Diagram/Image';
import Line from './Diagram/Lines';
import Paths from './Diagram/Paths';
import Rect from './Diagram/Rect';

type DiagramProps<T extends Diagram['type']> = DiagramPropsMap[T];

const DrawLayer: React.FC = () => {
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const imageRef = useRef<Konva.Image>(null);
  const diagramMap = useRef<Map<string, DiagramProps<Diagram['type']>>>(new Map());
  const [guideLines, setGuideLines] = useState<{
    v: number[];
    h: number[];
    points: { x: number; y: number }[];
  }>({ v: [], h: [], points: [] });
  const snapThreshold = 6;

  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );

  const { layerConfig, drawingId, stageRef } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
      drawingId: state.drawingId,
      stageRef: state.stageRef,
    }))
  );
  const { drawingLayer, setDrawingLayer, pushHistory, layers, replaceCurrentHistory } =
    useLayerStore(
      useShallow((state) => ({
        drawingLayer: state.drawingLayer,
        setDrawingLayer: state.setDrawingLayer,
        pushHistory: state.pushHistory,
        layers: state.layers,
        replaceCurrentHistory: state.replaceCurrentHistory,
      }))
    );

  const clearCache = useMemoizedFn(() => {
    diagramMap.current.clear();
  });

  const handleBindTransformer = useMemoizedFn(() => {
    if (!trRef.current || !imageRef.current) return;
    trRef.current?.nodes([imageRef.current!]);
    trRef.current?.getLayer()?.batchDraw();
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

  useEffect(() => {
    onGroupNodeChange();
  }, [drawingLayer?.id, drawingLayer?.version]);

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
        // diagramMap.current.set(id, props);
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

  const onGroupNodeChange = async (isPushHistory = false) => {
    if (!drawingLayer) return;
    // If there is no change.
    if (
      drawingLayer.diagrams.length === 1 &&
      drawingLayer.diagrams[0].type === 'image' &&
      drawingLayer.image &&
      drawingLayer.image?.rotation === undefined
    ) {
      requestAnimationFrame(() => {
        handleBindTransformer();
      });
      return;
    }

    const node = groupRef.current;
    const stage = stageRef?.current;
    if (!node || !stage) return;

    // 克隆 Group 节点用于离屏截图
    const clonedGroup = node.clone();

    // 创建离屏 Stage（不添加到 DOM，不会显示）
    const offscreenContainer = document.createElement('div');
    const offscreenStage = new Konva.Stage({
      container: offscreenContainer,
      width: layerConfig.width,
      height: layerConfig.height,
    });

    // 创建离屏 Layer 并添加克隆的 Group
    const offscreenLayer = new Konva.Layer({
      x: 0,
      y: 0,
      clipWidth: layerConfig.width,
      clipHeight: layerConfig.height,
    });
    offscreenStage.add(offscreenLayer);
    offscreenLayer.add(clonedGroup);

    // 确保离屏截图时 fills 处于可见状态（拖拽时原节点可能被设为 visible:false）
    clonedGroup.find<Konva.Image>('Image').forEach((imgNode) => {
      imgNode.visible(true);
    });

    // 在离屏 Stage 上获取坐标（未缩放）
    const groupRect = clonedGroup.getClientRect();

    let relativeX = 0;
    let relativeY = 0;
    let clipWidth = 0;
    let clipHeight = 0;
    let clipLeft = 0;
    let clipTop = 0;

    const targetWidth = 1920;
    let pixelRatio = targetWidth / layerConfig.width;
    pixelRatio = Math.max(1, Math.min(pixelRatio, 3));

    // Layer 边界（离屏 Stage 中 Layer 位置是 0,0）
    const layerX = 0;
    const layerY = 0;
    const layerWidth = layerConfig.width;
    const layerHeight = layerConfig.height;

    if (groupRect.x < layerX) {
      relativeX = 0;
      clipWidth = layerX - groupRect.x;
      clipLeft = layerX - groupRect.x;
    } else {
      relativeX = groupRect.x - layerX;
    }

    if (groupRect.x + groupRect.width > layerX + layerWidth) {
      clipWidth = groupRect.x + groupRect.width - (layerX + layerWidth);
    }

    if (groupRect.y < layerY) {
      relativeY = 0;
      clipHeight = layerY - groupRect.y;
      clipTop = layerY - groupRect.y;
    } else {
      relativeY = groupRect.y - layerY;
    }

    if (groupRect.y + groupRect.height > layerY + layerHeight) {
      clipHeight = groupRect.y + groupRect.height - (layerY + layerHeight);
    }

    const layerCanvas = clonedGroup.toCanvas();
    const imageData = layerCanvas
      .getContext('2d')
      ?.getImageData(clipLeft, clipTop, groupRect.width - clipWidth, groupRect.height - clipHeight);

    const { bounds } = cropTransparentBorder(imageData!);

    const blob = (await clonedGroup.toBlob({
      pixelRatio: pixelRatio,
      mimeType: 'image/png',
      quality: 1,
      x: Math.max(groupRect.x, layerX) + bounds.left,
      y: Math.max(groupRect.y, layerY) + bounds.top,
      width: bounds.width,
      height: bounds.height,
    })) as Blob;

    // 销毁离屏资源
    offscreenStage.destroy();

    const id = generateUUID();

    blob.arrayBuffer().then(async (buffer) => {
      imageManager.saveImage(id, buffer);
    });

    const img = new window.Image();
    img.src = URL.createObjectURL(blob);
    img.onload = () => {
      // 离屏 Stage 是 scale=1，坐标已经是正常的 Layer 坐标
      const image: FillType = {
        x: relativeX + bounds.left,
        y: relativeY + bounds.top,
        width: bounds.width,
        height: bounds.height,
        id,
        img,
        src: img.src,
        visible: true,
      };
      const newDrawingLayer = {
        ...drawingLayer!,
        image: image,
        lines: [],
        eraserLines: [],
        rects: [],
        ellipses: [],
        paths: [],
        // fills: drawingLayer.fills.map((i) => ({ ...i, visible: true })),
        diagrams: [
          ...drawingLayer.diagrams.filter((diagram) => ['fill', 'image'].includes(diagram.type)),
          { id: image.id, type: 'image' as const },
        ],
      };
      clearCache();
      setDrawingLayer(newDrawingLayer as Layers);

      if (isPushHistory) {
        pushHistory(
          layers.map((layer) =>
            layer.id !== drawingLayer?.id ? layer : (newDrawingLayer as Layers)
          )
        );
      } else {
        replaceCurrentHistory(
          layers.map((layer) =>
            layer.id !== drawingLayer?.id
              ? layer
              : ({
                  ...newDrawingLayer,
                  fills: [],
                  diagrams: [{ id: image.id, type: 'image' as const }],
                } as Layers)
          )
        );
      }

      requestAnimationFrame(() => {
        handleBindTransformer();
      });
    };
  };

  const handleDragStart = useMemoizedFn(() => {
    clearCache();
    const container = document.getElementById(CANVAS_CONTAINER_ID);
    container!.style.cursor = 'move';
    setGuideLines({ v: [], h: [], points: [] });
    handleBindTransformer();

    setDrawingLayer({
      ...drawingLayer!,
      fills: drawingLayer?.fills.map((i) => ({ ...i, visible: false })) || [],
    });
  });

  const handleDragEnd = useMemoizedFn((_e: unknown, rotation?: number) => {
    const node = imageRef.current;

    if (!node) return;

    const currentImage = drawingLayer?.image;
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
      ...drawingLayer!,
      image: updatedImage,
    };
    setDrawingLayer(newDrawingLayer as Layers);

    pushHistory(
      layers.map((layer) => (layer.id !== drawingLayer?.id ? layer : (newDrawingLayer as Layers)))
    );

    const container = document.getElementById(CANVAS_CONTAINER_ID);
    container!.style.cursor = '';
    setGuideLines({ v: [], h: [], points: [] });
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
      id={drawingLayer?.id}
    >
      <Group ref={groupRef} clipWidth={layerConfig.width} clipHeight={layerConfig.height}>
        {drawingLayer?.diagrams.map((diagram) => {
          const props = getDiagramProps(diagram.id, diagram.type)!;

          switch (diagram.type) {
            case 'path': {
              return <Paths key={diagram.id} {...(props as LineType)} />;
            }
            case 'image':
              return (
                <Image
                  ref={imageRef}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  key={diagram.id}
                  handleBindTransformer={handleBindTransformer}
                  handleDragMove={handleDragMove}
                  {...(props as FillType)}
                />
              );
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
          onTransformStart={handleDragStart}
          onTransformEnd={(e) => {
            const rotation = imageRef.current?.rotation();
            handleDragEnd(e, rotation);
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
        opacity={1 - (drawingLayer?.opacity ?? 100) / 100}
      />
    </KonvaLayer>
  );
};

export default React.memo(DrawLayer);
