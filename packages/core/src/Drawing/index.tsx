import { useKeyPress, useMemoizedFn, useMount } from '@monorepo/common';
import Konva from 'konva';
import type { Vector2d } from 'konva/lib/types';
import React, { useMemo, useRef, useState } from 'react';
import { Stage } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import type { DrawingProps } from '..';
import { Tools } from '..';
import Tool from '../components/Tool';
import useBindStageRef from '../hooks/useBindRef';
import { useDrawingStore } from '../store/useDrawing';
import useLayerStore from '../store/useLayer';
import useToolsStore from '../store/useTools';
import type { Point2D } from '../types/Drawing';
import { Actions } from '../types/Drawing';
import type { Line } from '../types/Layers';
import {
  ASIDE_WIDTH,
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
  const { stageConfig, setStageConfig, setLayerConfig, layerConfig, lineConfig } = useDrawingStore(
    useShallow((state) => ({
      stageConfig: state.stageConfig,
      setStageConfig: state.setStageConfig,
      setLayerConfig: state.setLayerConfig,
      layerConfig: state.layerConfig,
      lineConfig: state.lineConfig,
    }))
  );
  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );
  const { setDrawingLayer, getDrawingLayer } = useLayerStore(
    useShallow((state) => ({
      setDrawingLayer: state.setDrawingLayer,
      getDrawingLayer: state.getDrawingLayer,
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
      setStageDraggable(true);
    },
    {
      events: ['keydown'],
    }
  );
  useKeyPress(
    'space',
    () => {
      setStageDraggable(false);
    },
    {
      events: ['keyup'],
    }
  );
  //windows chrome
  useKeyPress('alt', (e) => e.preventDefault());

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
  const getDrawingInfo = useMemoizedFn((e: Konva.KonvaEventObject<Event>) => {
    const pos = e?.target?.getStage()?.getRelativePointerPosition() as Vector2d;
    const config = lineConfig;
    return {
      pos,
      config,
    };
  });

  const onLineMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    isDrawing.current = true;
    const currentLayer = getDrawingLayer();
    if (!currentLayer) return;
    const { pos, config } = getDrawingInfo(e);
    const { x, y } = layerConfig;
    const { scale } = stageConfig;
    const line: Line = {
      points: [pos.x - x, pos.y - y],
      strokeWidth: config.strokeWidth,
      stroke: config.stroke,
      opacity: config.opacity,
      tension: Math.max(config.stabilizer ? config.stabilizer / 4 : 0, 0.7),
      eraser: false,
      id: generateUUID(),
      hardness: 1,
      pressure: [0],
      suppress: false,
      stabilizer: 0,
      scale: scale,
    };
    currentLayer.lines.push(line);
    setDrawingLayer({ ...currentLayer, lines: [...currentLayer.lines, line] });
  };

  const onLineMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const currentLayer = getDrawingLayer();
    if (!currentLayer || !isDrawing.current || !currentLayer?.lines?.length) return;
    const { pos: point } = getDrawingInfo(e);
    const pressure = (e.evt as unknown as TouchEvent).touches?.[0]?.force || 0;
    let lastLine = currentLayer.lines[currentLayer.lines.length - 1];
    lastLine.points = (lastLine.points as number[]).concat([
      point.x - layerConfig.x,
      point.y - layerConfig.y,
    ]);
    lastLine.pressure.push(pressure);
    const value = [...currentLayer.lines];
    setDrawingLayer({ ...currentLayer, lines: value });
  };

  const onLineMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    isDrawing.current = false;
    // pushHistory();
  };

  //drawing layer
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    switch (activeKey) {
      case Actions.PEN:
        return onLineMouseDown(e);
      default:
        break;
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    switch (activeKey) {
      case Actions.PEN:
        return onLineMouseMove(e);
      default:
        break;
    }
  };

  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    switch (activeKey) {
      case Actions.PEN:
        return onLineMouseUp(e);
      default:
        break;
    }
  };
  return (
    <>
      <Stage
        ref={stageRef}
        style={{
          cursor: cursorStyle,
        }}
        width={size.width}
        height={size.height}
        x={stageConfig.x}
        y={stageConfig.y}
        scaleX={stageConfig.scale}
        scaleY={stageConfig.scale}
        onContextMenu={(e) => e.evt.preventDefault()}
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
      {tools?.includes(Tools.TOOL) && <Tool />}
    </>
  );
};

export default Drawing;
