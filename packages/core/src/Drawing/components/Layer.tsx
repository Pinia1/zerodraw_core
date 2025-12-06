import { cropTransparentBorder, generateUUID, useMemoizedFn } from '@monorepo/common';
import Konva from 'konva';
import React, { useRef } from 'react';
import { Group, Layer as KonvaLayer, Rect as KonvaRect } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import useLayerStore from '../../store/useLayer';
import {
  Diagram,
  DiagramPropsMap,
  Ellipse as EllipseType,
  Fill as FillType,
  Layers,
  Line as LineType,
  Rect as RectType,
} from '../../types/Layers';
import imageManager from '../../utils/imageManager';
import Ellipse from './Diagram/Ellipse';
import Eraser from './Diagram/Eraser';
import Fill from './Diagram/Fill';
import Image from './Diagram/Image';
import Line from './Diagram/Lines';
import Paths from './Diagram/Paths';
import Rect from './Diagram/Rect';

type DiagramProps<T extends Diagram['type']> = DiagramPropsMap[T];

const DrawLayer: React.FC<Layers> = (props) => {
  const { opacity, diagrams, paths, eraserLines, rects, ellipses, lines, fills, image } = props;
  const layerRef = useRef<Konva.Layer>(null);
  const groupRef = useRef<Konva.Group>(null);
  const diagramMap = useRef<Map<string, DiagramProps<Diagram['type']>>>(new Map());

  const { layerConfig, drawingId, stageRef } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
      drawingId: state.drawingId,
      stageRef: state.stageRef,
    }))
  );
  const { setDrawingLayer, pushHistory, layers } = useLayerStore(
    useShallow((state) => ({
      setDrawingLayer: state.setDrawingLayer,
      pushHistory: state.pushHistory,
      layers: state.layers,
    }))
  );

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

  const onGroupNodeChange = async () => {
    if (!props) return;
    // If there is no change.
    if (
      diagrams.length === 1 &&
      diagrams[0].type === 'image' &&
      image &&
      image?.rotation === undefined
    ) {
      requestAnimationFrame(() => {
        //todo
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

    const imageData = clonedGroup
      .toCanvas()
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
      };
      const newDrawingLayer = {
        ...props!,
        image: image,
        lines: [],
        eraserLines: [],
        rects: [],
        ellipses: [],
        paths: [],
        fills: [],
        diagrams: [{ id: image.id, type: 'image' as const }],
      };
      clearCache();
      setDrawingLayer(newDrawingLayer as Layers);

      pushHistory(
        layers.map((layer) => (layer.id !== props?.id ? layer : (newDrawingLayer as Layers)))
      );
    };
  };

  //   useMount(() => {
  //     layerRef.current?.cache();
  //   });

  return (
    <KonvaLayer
      ref={layerRef}
      x={layerConfig.x}
      y={layerConfig.y}
      clipWidth={layerConfig.width}
      clipHeight={layerConfig.height}
      listening={false}
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
            case 'image':
              return <Image key={diagram.id} {...(props as FillType)} />;
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
