import { useKeyPress, useMemoizedFn, useMount } from '@monorepo/common';
import Konva from 'konva';
import type { Vector2d } from 'konva/lib/types';
import React, { useMemo, useRef, useState } from 'react';
import { Stage } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import type { DrawingProps } from '..';
import { Tools } from '..';
import Cursor from '../components/Cursor';
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
  INCREASE_SCALE,
  MAX_SCALE,
  MIN_SCALE,
  PROMPT_WIDTH,
  RATIO,
  REDUCE_SCALE,
  WIDTH,
} from '../utils/drawing';
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
    }))
  );

  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );
  const { setDrawingLayer, drawingLayer } = useLayerStore(
    useShallow((state) => ({
      setDrawingLayer: state.setDrawingLayer,
      drawingLayer: state.drawingLayer,
    }))
  );
  const init = useMemoizedFn(() => {
    const width = size.width - PROMPT_WIDTH - 80 - ASIDE_WIDTH;
    const height = width / RATIO;
    setLayerConfig({
      width,
      height,
      x: (size.width - PROMPT_WIDTH - width + ASIDE_WIDTH) / 2,
      y: (size.height - height) / 2,
    });
  });

  const cursorStyle = useMemo(() => {
    if (stageDraggable) return 'grab';
    switch (activeKey) {
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
    if (!Number.isInteger(deltaY)) {
      const { scale, x, y } = getScaleAndPosition(
        deltaY,
        Math.abs(deltaY) > 2 ? REDUCE_SCALE : INCREASE_SCALE,
        pointer
      );
      return scaling(scale, { x, y });
    }

    if (e.evt.altKey && deltaY !== 0) {
      const { scale, x, y } = getScaleAndPosition(deltaY, 0.03, pointer);
      return scaling(scale, { x, y });
    }

    const threshold = 1;
    if (Math.abs(deltaY) < threshold && Math.abs(e.evt.deltaX) < threshold) return;

    const newPosition = {
      x: stageConfig.x - e.evt.deltaX,
      y: stageConfig.y - deltaY,
    };
    setStageConfig({ ...stageConfig, x: newPosition.x, y: newPosition.y });
  });

  const onDragEnd = useMemoizedFn((e: Konva.KonvaEventObject<DragEvent>) => {
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
    type: keyof Pick<Layers, 'lines' | 'eraserLines' | 'rects' | 'ellipses'>;
  } => {
    switch (activeKey) {
      case Actions.ERASER:
        return {
          diagrams: 'eraserLine',
          type: 'eraserLines',
        };
      case Actions.PEN:
        return {
          diagrams: 'line',
          type: 'lines',
        };
      case Actions.RECT:
        return {
          diagrams: 'rect',
          type: 'rects',
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

  const onLineMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
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

  const onLineMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
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

  const onLineMouseUp = () => {
    isDrawing.current = false;
    setDrawingId(null);
    // pushHistory();
  };

  const onRectMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
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

  const onRectMouseUp = () => {
    isDrawing.current = false;
    setDrawingId(null);
    // pushHistory();
  };

  const onEllipseMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
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
  const onEllipseMouseUp = () => {
    isDrawing.current = false;
    setDrawingId(null);
    // pushHistory();
  };

  //drawing layer
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isLeftMouseDown(e) || stageDraggable) return;
    switch (activeKey) {
      case Actions.ERASER:
      case Actions.PEN:
        return onLineMouseDown(e);
      case Actions.RECT:
        return onRectMouseDown(e);
      case Actions.ELLIPSE:
        return onEllipseMouseDown(e);
      default:
        break;
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (stageDraggable) return;
    switch (activeKey) {
      case Actions.PEN:
      case Actions.ERASER:
        return onLineMouseMove(e);
      case Actions.RECT:
        return onRectMouseMove(e);
      case Actions.ELLIPSE:
        return onEllipseMouseMove(e);
      default:
        break;
    }
  };

  const handleMouseUp = () => {
    switch (activeKey) {
      case Actions.PEN:
      case Actions.ERASER:
        return onLineMouseUp();
      case Actions.RECT:
        return onRectMouseUp();
      case Actions.ELLIPSE:
        return onEllipseMouseUp();
      default:
        break;
    }
  };

  const handleContextMenu = useMemoizedFn((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    e.evt.stopPropagation();
    if (![Actions.PEN, Actions.ERASER].includes(activeKey)) return;
    setBrushDetailConfPosition({ visible: true, position: { x: e.evt.clientX, y: e.evt.clientY } });
  });

  return (
    <>
      <Stage
        ref={stageRef}
        style={{
          cursor: cursorStyle,
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
        <Layer />
      </Stage>
      <Cursor />
      {tools?.includes(Tools.TOOL) && <Tool />}
    </>
  );
};

export default Drawing;
