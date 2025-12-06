import { hexToRgba, useKeyPress, useMemoizedFn, useMount } from '@monorepo/common';
import Konva from 'konva';
import type { Vector2d } from 'konva/lib/types';
import React, { useMemo, useRef, useState } from 'react';
import { Stage } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import type { DrawingProps } from '..';
import { Tools } from '..';
import Cursor from '../components/Cursor';
import Flexible from '../components/Flexible';
import LayersControl from '../components/Layers';
import Tool from '../components/Tool';
import useBindStageRef from '../hooks/useBindRef';
import { useDrawingStore } from '../store/useDrawing';
import useLayerStore from '../store/useLayer';
import useToolsStore from '../store/useTools';
import type { Point2D } from '../types/Drawing';
import { Actions, EraserConfigTypes, LineConfigTypes } from '../types/Drawing';
import type { Diagram, Layers, Line } from '../types/Layers';
import {
  ASIDE_WIDTH,
  CANVAS_CONTAINER_ID,
  generateUUID,
  MAX_SCALE,
  MIN_SCALE,
  PROMPT_WIDTH,
  RATIO,
  REDUCE_SCALE,
  WIDTH,
} from '../utils/drawing';
import imageManager from '../utils/imageManager';
import DrawLayer from './components/DrawLayer';
import Layer from './components/Layer';
import Mosic from './components/Mosic';

const Drawing: React.FC<DrawingProps> = (props) => {
  const { size, tools = Tools.TOOL } = props;
  const stageRef = useBindStageRef();
  const isDrawing = useRef<boolean>(false);

  const [stageDraggable, setStageDraggable] = useState(false);
  const {
    stageConfig,
    setStageConfig,
    setLayerConfig,
    layerConfig,
    lineConfig,
    eraserConfig,
    fillColor,
    graphConfig,
    setBrushDetailConfPosition,
    setDrawingId,
    workerRef,
  } = useDrawingStore(
    useShallow((state) => ({
      stageConfig: state.stageConfig,
      setStageConfig: state.setStageConfig,
      setLayerConfig: state.setLayerConfig,
      layerConfig: state.layerConfig,
      lineConfig: state.lineConfig,
      fillColor: state.fillColor,
      setBrushDetailConfPosition: state.setBrushDetailConfPosition,
      eraserConfig: state.eraserConfig,
      graphConfig: state.graphConfig,
      setDrawingId: state.setDrawingId,
      workerRef: state.workerRef,
    }))
  );

  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );
  const { setDrawingLayer, layers, initHistory, pushHistory, getDrawingLayer, drawingLayer } =
    useLayerStore(
      useShallow((state) => ({
        setDrawingLayer: state.setDrawingLayer,
        layers: state.layers,
        initHistory: state.initHistory,
        pushHistory: state.pushHistory,
        getDrawingLayer: state.getDrawingLayer,
        drawingLayer: state.drawingLayer,
      }))
    );

  const init = useMemoizedFn(() => {
    const width = size.width - PROMPT_WIDTH - 80 - ASIDE_WIDTH;
    const height = width / RATIO;
    setLayerConfig({
      ...layerConfig,
      width,
      height,
      x: (size.width - PROMPT_WIDTH - width + ASIDE_WIDTH) / 2,
      y: (size.height - height) / 2,
    });
    setStageConfig({
      scale: 1,
      x: 0,
      y: 0,
    });
  });

  const pushDrawingHistory = () => {
    const drawingLayer = getDrawingLayer();
    const drawingIndex = layers.findIndex((layer) => layer.id === drawingLayer?.id);
    if (drawingIndex === -1 || !drawingLayer) return;

    const newLayers = [...layers];
    newLayers[drawingIndex] = drawingLayer as Layers;

    isDrawing.current = false;
    setDrawingId(null);

    pushHistory(newLayers);
  };

  const cursorStyle = useMemo(() => {
    if (stageDraggable) return 'grab';
    switch (activeKey) {
      case Actions.RECT:
      case Actions.ELLIPSE:
      case Actions.LINE:
      case Actions.PEN:
        return 'crosshair';
      case Actions.FILL:
      case Actions.ERASER:
        return 'none';
      default:
        break;
    }
    return 'default';
  }, [stageDraggable, activeKey]);

  useMount(() => {
    init();
    initHistory([]);
  });
  useKeyPress(
    'space',
    () => {
      if (isDrawing.current) return;
      setStageDraggable(true);
    },
    {
      events: ['keydown'],
    }
  );
  useKeyPress(
    'space',
    () => {
      if (isDrawing.current) return;
      setStageDraggable(false);
    },
    {
      events: ['keyup'],
    }
  );
  //windows chrome
  useKeyPress('alt', (e) => e.preventDefault());

  useKeyPress(
    'esc',
    () => {
      finishLine();
    },
    {
      events: ['keydown'],
    }
  );
  useKeyPress('Escape', () => {}, {
    events: ['keyup'],
  });

  //todo
  // useKeyPress(
  //   'ctrl.z',
  //   (e) => {
  //     e.preventDefault();
  //     // finishLine();
  //   },
  //   {
  //     events: ['keydown'],
  //   }
  // );

  const getGroupPos = (stage: Konva.Stage) => {
    let pos: any = null;
    const layersDom = stage.children;

    const lastLayer = layersDom.find((i: Konva.Node) => i.attrs.isDrawing);

    lastLayer?.children.forEach((i: Konva.Node) => {
      if (i.getType() === 'Group') {
        const pointerPos = stage.getPointerPosition() as Vector2d;
        const group = i.getClientRect();
        const layerRect = lastLayer.getClientRect();

        const x = pointerPos.x - group.x;
        const y = pointerPos.y - group.y;
        const relativePos = {
          x: Math.round(x),
          y: Math.round(y),
        };
        //画布保持1920，保持group.width占用的画布比例
        const pixelRatio = WIDTH / layerConfig.width / stageConfig.scale;

        pos = {
          x: group.x - layerRect.x,
          y: group.y - layerRect.y,
          width: group.width,
          height: group.height,
          relativePos,
          pixelRatio,
        };
        const absPos = lastLayer.getAbsolutePosition();
        if (pos.y <= 0) {
          pos.y = group.y - absPos.y;
        }
        if (pos.x <= 0) {
          pos.x = group.x - absPos.x;
        }
        const canvas = lastLayer.toCanvas({
          pixelRatio: pixelRatio,
          x: group.x,
          y: group.y,
          width: group.width,
          height: group.height,
        });

        const ctx = canvas.getContext('2d')!;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        pos.imageData = imageData;
      }
    });

    return pos;
  };

  const isLeftMouseDown = useMemoizedFn((e: Konva.KonvaEventObject<MouseEvent>) => {
    return e.evt.button === 0;
  });

  const getScaleAndPosition = useMemoizedFn((deltaY: number, num: number, pointer: Point2D) => {
    const scaleBy = deltaY > 0 ? 1 - num : 1 + num;
    const newScale = stageConfig.scale * scaleBy;
    const newX = pointer?.x - (pointer?.x - stageConfig.x) * scaleBy;
    const newY = pointer?.y - (pointer?.y - stageConfig.y) * scaleBy;
    return {
      scale: newScale,
      x: newX,
      y: newY,
    };
  });

  const scaling = useMemoizedFn((newScale: number, newPos: Point2D) => {
    const ratio = Math.round(((layerConfig.width * newScale) / WIDTH) * 100);
    if (ratio < MIN_SCALE || ratio > MAX_SCALE) return;
    setStageConfig({ scale: newScale, x: newPos.x, y: newPos.y });
  });

  const onStageWheel = useMemoizedFn((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();

    const pointer = stage?.getPointerPosition() ?? { x: 0, y: 0 };
    const deltaY = e.evt.deltaY;

    // 垂直滚动始终触发缩放
    if (deltaY !== 0) {
      // 根据 deltaY 大小动态调整缩放速度
      const scaleStep = Math.min(Math.abs(deltaY) / 500, REDUCE_SCALE);
      const { scale, x, y } = getScaleAndPosition(deltaY, scaleStep, pointer);
      return scaling(scale, { x, y });
    }

    // 水平滚动触发平移（触控板）
    if (e.evt.deltaX !== 0) {
      const newPosition = {
        x: stageConfig.x - e.evt.deltaX,
        y: stageConfig.y,
      };
      setStageConfig({ ...stageConfig, x: newPosition.x, y: newPosition.y });
    }
  });

  const onDragEnd = useMemoizedFn((e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();

    if (!stage || e.target !== stage) return;
    if (!stageDraggable) return;
    setStageConfig({
      ...stageConfig,
      x: e.target.x(),
      y: e.target.y(),
    });
  });
  const getDrawingInfo = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = e?.target?.getStage()?.getRelativePointerPosition() as Vector2d;
    let config: LineConfigTypes | EraserConfigTypes = lineConfig;
    const isEraser = activeKey === Actions.ERASER;
    if (isEraser) {
      config = eraserConfig;
    }
    return {
      pos,
      config: {
        ...config,
        stabilizer: isEraser ? undefined : lineConfig.stabilizer,
        hardness: isEraser ? undefined : lineConfig.hardness,
        fill: isEraser ? undefined : lineConfig.fill,
        eraser: isEraser,
      },
    };
  };
  const getDrawingTypes = (): {
    diagrams: Diagram['type'];
    type: keyof Pick<Layers, 'lines' | 'eraserLines' | 'rects' | 'ellipses' | 'paths'>;
  } => {
    switch (activeKey) {
      case Actions.ERASER:
        return {
          diagrams: 'eraserLine',
          type: 'eraserLines',
        };
      case Actions.PEN:
        return {
          diagrams: 'path',
          type: 'paths',
        };
      case Actions.RECT:
        return {
          diagrams: 'rect',
          type: 'rects',
        };
      case Actions.LINE:
        return {
          diagrams: 'line',
          type: 'lines',
        };
      case Actions.ELLIPSE:
        return {
          diagrams: 'ellipse',
          type: 'ellipses',
        };
      default:
        return {
          diagrams: 'line',
          type: 'lines',
        };
    }
  };

  const onPenMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return;
    isDrawing.current = true;
    const { pos, config } = getDrawingInfo(e);
    const { x, y } = layerConfig;
    const { scale } = stageConfig;
    const id = generateUUID();
    setDrawingId(id);
    const line: Line = {
      points: [pos.x - x, pos.y - y],
      strokeWidth: config.strokeWidth,
      stroke: fillColor,
      opacity: config.opacity,
      stabilizer: config.stabilizer || 0,
      hardness: config.hardness || 1,
      tension: Math.max(config.stabilizer ? config.stabilizer / 4 : 0, 0.7),
      eraser: config.eraser,
      id,
      pressure: [0],
      suppress: false,
      scale: scale,
      fill: !!config.fill,
    };
    const { type, diagrams } = getDrawingTypes();

    setDrawingLayer({
      ...drawingLayer,
      [type]: [...drawingLayer[type], line],
      diagrams: [...drawingLayer.diagrams, { id, type: diagrams }],
    });
  };

  const onPenMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const drawingLayer = getDrawingLayer();
    if (!drawingLayer || !isDrawing.current) return;
    const { pos: point } = getDrawingInfo(e);
    const pressure = (e.evt as unknown as TouchEvent).touches?.[0]?.force || 0;
    const { type } = getDrawingTypes();
    let lastLine = drawingLayer[type][drawingLayer[type].length - 1] as Line;
    lastLine.points = (lastLine.points as number[]).concat([
      point.x - layerConfig.x,
      point.y - layerConfig.y,
    ]);
    lastLine.pressure.push(pressure);
    const value = [...drawingLayer[type]];
    setDrawingLayer({ ...drawingLayer, [type]: value });
  };

  const onRectMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return;
    isDrawing.current = true;
    const { pos } = getDrawingInfo(e);
    const { x, y } = layerConfig;
    const { scale } = stageConfig;
    const id = generateUUID();
    setDrawingId(id);
    const rect = {
      x: pos.x - x,
      y: pos.y - y,
      width: 0,
      height: 0,
      strokeWidth: graphConfig.strokeWidth,
      stroke: fillColor,
      opacity: graphConfig.opacity,
      fill: graphConfig.fill ? fillColor : '',
      scale: scale,
      id,
    };
    const { type, diagrams } = getDrawingTypes();
    setDrawingLayer({
      ...drawingLayer,
      [type]: [...drawingLayer[type], rect],
      diagrams: [...drawingLayer.diagrams, { id, type: diagrams }],
    });
  };

  const onRectMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const drawingLayer = getDrawingLayer();
    if (!isDrawing.current) return;
    const rects = drawingLayer?.rects || [];
    let rect = rects[rects.length - 1];
    if (!rect) return;
    const { x, y } = layerConfig;
    const { pos } = getDrawingInfo(e);
    rect = {
      ...rect,
      width: pos.x - x - rect.x!,
      height: pos.y - y - rect.y!,
    };
    rects.splice(rects.length - 1, 1, rect);
    setDrawingLayer({ ...drawingLayer!, rects: rects });
  };

  const onEllipseMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return;
    isDrawing.current = true;
    const { pos } = getDrawingInfo(e);
    const { x, y } = layerConfig;
    const { scale } = stageConfig;
    const id = generateUUID();
    setDrawingId(id);
    const ellipse = {
      x: pos.x - x,
      y: pos.y - y,
      width: 0,
      height: 0,
      strokeWidth: graphConfig.strokeWidth,
      stroke: fillColor,
      opacity: graphConfig.opacity,
      fill: graphConfig.fill ? fillColor : '',
      scale: scale,
      id: id,
      mouseX: pos.x - x,
      mouseY: pos.y - y,
    };
    const { type, diagrams } = getDrawingTypes();
    setDrawingLayer({
      ...drawingLayer,
      [type]: [...drawingLayer[type], ellipse],
      diagrams: [...drawingLayer.diagrams, { id, type: diagrams }],
    });
  };
  const onEllipseMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const drawingLayer = getDrawingLayer();
    if (!isDrawing.current) return;
    const ellipses = drawingLayer?.ellipses || [];
    let ellipse = ellipses[ellipses.length - 1];
    if (!ellipse) return;
    const { x, y } = layerConfig;
    const { pos } = getDrawingInfo(e);
    const width = pos.x - x - ellipse.mouseX;
    const height = pos.y - y - ellipse.mouseY;
    const newX = ellipse.mouseX + width / 2;
    const newY = ellipse.mouseY + height / 2;
    ellipse = {
      ...ellipse,
      width: Math.abs(width),
      height: Math.abs(height),
      x: newX,
      y: newY,
    };
    ellipses.splice(ellipses.length - 1, 1, ellipse);
    setDrawingLayer({ ...drawingLayer!, ellipses: ellipses });
  };

  const onLineMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return;
    const { pos } = getDrawingInfo(e);
    const { x, y } = layerConfig;
    const { scale } = stageConfig;
    let startX = pos.x - x;
    let startY = pos.y - y;
    if (isDrawing.current && activeKey === Actions.LINE) {
      const lines = drawingLayer.lines || [];
      const lastLine = lines[lines.length - 1];
      if (lastLine && lastLine.points.length >= 4) {
        startX = lastLine.points[2];
        startY = lastLine.points[3];
      }
    }
    isDrawing.current = true;
    const id = generateUUID();
    setDrawingId(id);
    const line: Line = {
      points: [startX, startY, startX, startY],
      strokeWidth: graphConfig.strokeWidth,
      stroke: fillColor,
      opacity: graphConfig.opacity,
      stabilizer: 0,
      hardness: 1,
      tension: 0,
      eraser: false,
      id,
      pressure: [0],
      suppress: false,
      scale: scale,
      fill: false,
    };
    const { type, diagrams } = getDrawingTypes();
    setDrawingLayer({
      ...drawingLayer,
      [type]: [...drawingLayer[type], line],
      diagrams: [...drawingLayer.diagrams, { id, type: diagrams }],
    });
  };

  const onLineMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const drawingLayer = getDrawingLayer();
    if (!isDrawing.current || !drawingLayer) return;
    const lines = drawingLayer?.lines || [];
    let line = lines[lines.length - 1];
    if (!line) return;
    const { x, y } = layerConfig;
    const { pos } = getDrawingInfo(e);
    line = {
      ...line,
      points: [line.points[0], line.points[1], pos.x - x, pos.y - y],
    };
    lines.splice(lines.length - 1, 1, line);
    setDrawingLayer({ ...drawingLayer!, lines: lines });
  };

  const finishLine = () => {
    const drawingLayer = getDrawingLayer();
    if (isDrawing.current && activeKey === Actions.LINE) {
      isDrawing.current = false;
      setDrawingId(null);
      const lines = drawingLayer?.lines || [];
      let line = lines[lines.length - 1];
      line.points = line.points.slice(0, -2);
      lines.splice(lines.length - 1, 1, line);
      setDrawingLayer({ ...drawingLayer!, lines: lines });
    }
  };

  const onFillMouseDown = async (e: Konva.KonvaEventObject<MouseEvent>) => {
    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return;
    try {
      const stage = e.target.getStage()!;
      const groupPos = getGroupPos(stage);
      const {
        imageData,
        relativePos: { x: posX, y: posY },
        pixelRatio,
      } = groupPos;
      const magnificationPosX = Math.round(posX * pixelRatio);
      const magnificationPosY = Math.round(posY * pixelRatio);
      const tolerance = 10;

      const { buffer, id } = (await workerRef?.postMessage({
        imageData,
        posX: magnificationPosX,
        posY: magnificationPosY,
        tolerance,
        fillColor: [hexToRgba(fillColor, lineConfig.opacity)],
        direction: 1,
        canvasConfig: {
          layerBackground: '#ffffff',
        },
        groupPos,
      })) as { buffer: ArrayBuffer | null; id: string };
      const { scale } = stageConfig;

      await imageManager.saveImage(id, buffer!);

      const image = {
        x: groupPos.x / scale,
        y: groupPos.y / scale,
        width: groupPos.width / scale,
        height: groupPos.height / scale,
        id,
      };

      setDrawingLayer({
        ...drawingLayer,
        fills: [...drawingLayer.fills, image],
        diagrams: [...drawingLayer.diagrams, { id, type: 'fill' }],
      });

      pushDrawingHistory();
    } catch (error) {
      console.log(error, 'fill error');
    }
  };

  // is point in layer
  const isPointInLayer = (pos: Vector2d | null): boolean => {
    if (!pos) return false;
    const { x, y, width, height } = layerConfig;
    return pos.x >= x && pos.x <= x + width && pos.y >= y && pos.y <= y + height;
  };

  //drawing layer
  const handleMouseDown = useMemoizedFn((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isLeftMouseDown(e) || stageDraggable) return;

    const pos = e.target.getStage()?.getRelativePointerPosition() ?? null;
    if (!isPointInLayer(pos)) return;

    switch (activeKey) {
      case Actions.ERASER:
      case Actions.PEN:
        return onPenMouseDown(e);
      case Actions.RECT:
        return onRectMouseDown(e);
      case Actions.ELLIPSE:
        return onEllipseMouseDown(e);
      case Actions.LINE:
        return onLineMouseDown(e);
      case Actions.FILL:
        return onFillMouseDown(e);
      default:
        break;
    }
  });

  const handleMouseMove = useMemoizedFn((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (stageDraggable) return;
    const pos = e.target.getStage()?.getRelativePointerPosition() ?? null;
    if (!isPointInLayer(pos)) return;
    switch (activeKey) {
      case Actions.PEN:
      case Actions.ERASER:
        return onPenMouseMove(e);
      case Actions.RECT:
        return onRectMouseMove(e);
      case Actions.ELLIPSE:
        return onEllipseMouseMove(e);
      case Actions.LINE:
        return onLineMouseMove(e);
      default:
        break;
    }
  });

  const handleMouseUp = useMemoizedFn(() => {
    switch (activeKey) {
      case Actions.PEN:
      case Actions.ERASER:
      case Actions.RECT:
      case Actions.ELLIPSE:
        return pushDrawingHistory();
      case Actions.LINE:
        return;
      default:
        break;
    }
  });

  const handleContextMenu = useMemoizedFn((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    e.evt.stopPropagation();
    finishLine();
    if (![Actions.PEN, Actions.ERASER].includes(activeKey)) return;
    setBrushDetailConfPosition({ visible: true, position: { x: e.evt.clientX, y: e.evt.clientY } });
  });

  return (
    <>
      <Stage
        ref={stageRef}
        style={{
          cursor: cursorStyle,
          position: 'relative',
        }}
        id={CANVAS_CONTAINER_ID}
        width={size.width}
        height={size.height}
        x={stageConfig.x}
        y={stageConfig.y}
        scaleX={stageConfig.scale}
        scaleY={stageConfig.scale}
        onContextMenu={handleContextMenu}
        draggable={stageDraggable}
        onWheel={onStageWheel}
        onDragEnd={onDragEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Mosic />
        {layers.map((layer) => {
          if (layer && layer.id !== drawingLayer?.id) {
            return <Layer key={layer.id} {...layer} />;
          }
          return null;
        })}
        <DrawLayer />
      </Stage>
      <Cursor />
      {tools?.includes(Tools.TOOL) && <Tool />}
      {tools?.includes(Tools.LAYERS_CONTROL) && <LayersControl />}
      {tools?.includes(Tools.FLEXIBLE) && <Flexible init={init} />}
    </>
  );
};

export default Drawing;
