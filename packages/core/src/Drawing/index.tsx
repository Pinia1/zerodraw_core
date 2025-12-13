import { hexToRgba, useMemoizedFn, useMount } from '@monorepo/common';
import Konva from 'konva';
import type { Vector2d } from 'konva/lib/types';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Stage } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import type { DrawingProps } from '..';
import { Tools } from '..';
import Cursor from '../components/Cursor';
import Flexible from '../components/Flexible';
import LayersControl from '../components/Layers';
import Tool from '../components/Tool';
import useBindStageRef from '../hooks/useBindRef';
import useDrawingKeyboard from '../hooks/useKeyboard';
import {
  isPointInCanvasBounds,
  normalizeKonvaPointerEvent,
} from '../input/normalizeKonvaPointerEvent';
import type { NormalizedPointerEvent } from '../input/types';
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
import { isMac, isMobile, isWindows } from '../utils/platform';
import DrawLayer from './components/DrawLayer';
import Layer from './components/Layer';
import Mosic from './components/Mosic';

const Drawing: React.FC<DrawingProps> = (props) => {
  const { size, tools = Tools.TOOL } = props;
  const stageRef = useBindStageRef();
  const isDrawing = useRef<boolean>(false);

  const [cursorVisible, setCursorVisible] = useState(true);

  const [stageDraggable, setStageDraggable] = useState(false);
  // iPad/触屏：多指手势期间禁用绘制，避免误触
  const isMultiTouchRef = useRef(false);

  // ===== iPad/触屏：双指平移 + 捏合缩放 =====
  const lastTwoFinger = useRef<{
    distance: number;
    center: { x: number; y: number };
  } | null>(null);

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
  const { setDrawingLayer, layers, initHistory, pushHistory, getDrawingLayer } = useLayerStore(
    useShallow((state) => ({
      setDrawingLayer: state.setDrawingLayer,
      layers: state.layers,
      initHistory: state.initHistory,
      pushHistory: state.pushHistory,
      getDrawingLayer: state.getDrawingLayer,
    }))
  );

  const renderOrderLayers = useMemo(() => {
    const newLayers = [...layers];
    newLayers.sort((a, b) => a.order - b.order);

    return newLayers;
  }, [layers]);

  const topLayer = useMemo(() => {
    return layers[layers.length - 1];
  }, [layers]);

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

  const finishLine = useMemoizedFn(() => {
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
  });

  const cursorStyle = useMemo(() => {
    if (stageDraggable) return 'grab';
    switch (activeKey) {
      case Actions.RECT:
      case Actions.LINE:
      case Actions.PEN:
      case Actions.ELLIPSE:
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
    initHistory();
  });

  useDrawingKeyboard({
    isDrawing,
    setStageDraggable,
    finishLine,
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

  // 旧逻辑已被 input adapter 统一吸收：按钮判断在 `normalizeKonvaPointerEvent` 内处理

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

  const normalizeWheelDelta = useMemoizedFn((evt: WheelEvent) => {
    // deltaMode: 0=pixel, 1=line, 2=page
    let dx = evt.deltaX;
    let dy = evt.deltaY;
    if (evt.deltaMode === 1) {
      dx *= 16;
      dy *= 16;
    } else if (evt.deltaMode === 2) {
      dx *= layerConfig.height || 800;
      dy *= layerConfig.height || 800;
    }
    return { dx, dy };
  });

  /**
   * 统一 wheel 行为：
   * - 触控板：默认平移（dx/dy），pinch 通常会带 ctrlKey -> 触发缩放
   * - 鼠标滚轮：默认缩放（更符合绘图软件习惯）
   */
  const onStageWheel = useMemoizedFn((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    // 某些浏览器/系统下即使 preventDefault，也可能继续冒泡导致页面滚动；这里额外 stopPropagation
    e.evt.stopPropagation();
    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition() ?? { x: 0, y: 0 };
    const { dx, dy } = normalizeWheelDelta(e.evt);

    // Windows 下 mouse wheel 往往 deltaMode=0 且 dy 值较大（约 100），触控板 dy 更小且更连续
    const isLikelyMouseWheel =
      e.evt.deltaMode !== 0 ||
      (isWindows && Math.abs(dy) >= 30 && Math.abs(dx) < 1) ||
      // 兜底：wheelDeltaY 在 mac 触控板上也经常存在，不能作为通用判据；仅在 Windows 上作为辅助
      (isWindows && typeof (e.evt as any).wheelDeltaY === 'number');
    const isPinchZoomGesture = !!(e.evt.ctrlKey || e.evt.metaKey);

    // 缩放优先级：pinch(通常 ctrlKey) > mouse wheel
    // mac 触控板：默认平移；只有 pinch 才缩放
    const shouldZoom = isPinchZoomGesture || (!isMac && isLikelyMouseWheel);

    if (shouldZoom) {
      if (dy === 0) return;
      const scaleStep = Math.min(Math.abs(dy) / 500, REDUCE_SCALE);
      const { scale, x, y } = getScaleAndPosition(dy, scaleStep, pointer);
      return scaling(scale, { x, y });
    }

    // 触控板平移：同时支持 x/y（Windows/mac 触控板差异在 normalizeWheelDelta 吸收）
    if (dx === 0 && dy === 0) return;
    setStageConfig({
      ...stageConfig,
      x: stageConfig.x - dx,
      y: stageConfig.y - dy,
    });
  });

  // 确保 wheel 在画布上不会滚动页面：绑定一个 passive:false 的原生监听器
  useEffect(() => {
    const stage = stageRef?.current;
    if (!stage) return;

    const container = stage.container();
    if (!container) return;

    const handler = (evt: WheelEvent) => {
      // 只在指针在 container 上时阻止页面滚动（事件目标就是 container 内部）
      evt.preventDefault();
    };

    container.addEventListener('wheel', handler, { passive: false });
    return () => {
      container.removeEventListener('wheel', handler as any);
    };
  }, [stageRef]);

  const getTouchCenterAndDistance = useMemoizedFn((stage: Konva.Stage, touches: TouchList) => {
    const rect = stage.container().getBoundingClientRect();
    const t0 = touches[0];
    const t1 = touches[1];
    const p0 = { x: t0.clientX - rect.left, y: t0.clientY - rect.top };
    const p1 = { x: t1.clientX - rect.left, y: t1.clientY - rect.top };
    const center = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const dx = p0.x - p1.x;
    const dy = p0.y - p1.y;
    const distance = Math.hypot(dx, dy);
    return { center, distance };
  });

  const onStageTouchStart = useMemoizedFn((e: Konva.KonvaEventObject<TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const touches = e.evt.touches;

    // 多指（>=2）视为手势：禁用绘制，防误触
    if (touches.length >= 2) {
      e.evt.preventDefault();
      isMultiTouchRef.current = true;

      // 如果正在绘制：直接“取消当前未完成图形”，不入历史、不留点，避免误触产生脏数据
      if (isDrawing.current) {
        const drawingLayer = getDrawingLayer();
        if (drawingLayer) {
          const { type, diagrams } = getDrawingTypes();
          // 按当前工具类型移除最后一个临时图元，并同步移除 diagrams 的最后一项（如果匹配）
          const arr = [...(drawingLayer[type] as any[])];
          const removed = arr.pop();
          const newDiagrams = [...drawingLayer.diagrams];
          const lastDiagram = newDiagrams[newDiagrams.length - 1];
          if (
            lastDiagram &&
            removed?.id &&
            lastDiagram.id === removed.id &&
            lastDiagram.type === diagrams
          ) {
            newDiagrams.pop();
          }
          setDrawingLayer({ ...drawingLayer, [type]: arr, diagrams: newDiagrams } as any);
        }
        isDrawing.current = false;
        setDrawingId(null);
      }

      lastTwoFinger.current = getTouchCenterAndDistance(stage, touches);
      return;
    }
  });

  const onStageTouchMove = useMemoizedFn((e: Konva.KonvaEventObject<TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const touches = e.evt.touches;
    if (touches.length < 2) return;
    e.evt.preventDefault();

    const curr = getTouchCenterAndDistance(stage, touches);
    const prev = lastTwoFinger.current;
    if (!prev) {
      lastTwoFinger.current = curr;
      return;
    }

    const scaleBy = prev.distance ? curr.distance / prev.distance : 1;
    const centerDelta = { x: curr.center.x - prev.center.x, y: curr.center.y - prev.center.y };

    // 更稳的判定：优先“平移”，只有当距离变化足够大且不是位移噪声时才触发缩放
    const distanceDelta = curr.distance - prev.distance;
    const distanceDeltaAbs = Math.abs(distanceDelta);
    const moveDelta = Math.hypot(centerDelta.x, centerDelta.y);

    // 死区：小于 6px 或者小于 1.5% 的距离变化，一律按平移处理
    const DIST_PX_DEADZONE = 6;
    const DIST_RATIO_DEADZONE = 0.015;
    const isZoom =
      distanceDeltaAbs > DIST_PX_DEADZONE &&
      distanceDeltaAbs > prev.distance * DIST_RATIO_DEADZONE &&
      // 如果主要是位移（moveDelta 很大），仍然偏向平移
      !(moveDelta > distanceDeltaAbs * 2);

    if (isZoom) {
      const newScale = stageConfig.scale * scaleBy;
      const newX = curr.center.x - (curr.center.x - stageConfig.x) * scaleBy;
      const newY = curr.center.y - (curr.center.y - stageConfig.y) * scaleBy;
      scaling(newScale, { x: newX, y: newY });
    } else {
      setStageConfig({
        ...stageConfig,
        x: stageConfig.x + centerDelta.x,
        y: stageConfig.y + centerDelta.y,
      });
    }

    lastTwoFinger.current = curr;
  });

  const onStageTouchEnd = useMemoizedFn((e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length < 2) {
      lastTwoFinger.current = null;
      isMultiTouchRef.current = false;
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

  const onPenInputDown = useMemoizedFn((input: NormalizedPointerEvent) => {
    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return;
    if (!input.canvasPoint) return;

    isDrawing.current = true;

    let config: LineConfigTypes | EraserConfigTypes = lineConfig;
    const isEraser = activeKey === Actions.ERASER;
    if (isEraser) config = eraserConfig;

    const id = generateUUID();
    setDrawingId(id);

    const line: Line = {
      points: [input.canvasPoint.x, input.canvasPoint.y],
      strokeWidth: config.strokeWidth,
      stroke: fillColor,
      opacity: config.opacity,
      stabilizer: isEraser ? 0 : lineConfig.stabilizer || 0,
      hardness: isEraser ? 1 : lineConfig.hardness || 1,
      tension: Math.max(!isEraser && lineConfig.stabilizer ? lineConfig.stabilizer / 4 : 0, 0.7),
      eraser: isEraser,
      id,
      pressure: [input.pressure || 0],
      suppress: false,
      scale: stageConfig.scale,
      fill: !isEraser ? !!lineConfig.fill : false,
    };

    const { type, diagrams } = getDrawingTypes();

    setDrawingLayer({
      ...drawingLayer,
      [type]: [...drawingLayer[type], line],
      diagrams: [...drawingLayer.diagrams, { id, type: diagrams }],
    });
  });

  const onPenInputMove = useMemoizedFn((input: NormalizedPointerEvent) => {
    const drawingLayer = getDrawingLayer();
    if (!drawingLayer || !isDrawing.current) return;
    if (!input.canvasPoint) return;

    const { type } = getDrawingTypes();
    const lines = drawingLayer[type] as Line[];
    const lastLine = lines[lines.length - 1];
    if (!lastLine) return;

    const updatedLine: Line = {
      ...lastLine,
      points: [...lastLine.points, input.canvasPoint.x, input.canvasPoint.y],
      pressure: [...lastLine.pressure, input.pressure || 0],
    };

    const newLines = [...lines.slice(0, -1), updatedLine];

    if (isMobile) {
      requestAnimationFrame(() => {
        setDrawingLayer({ ...drawingLayer, [type]: newLines });
      });
    } else {
      setDrawingLayer({ ...drawingLayer, [type]: newLines });
    }
  });

  const onRectInputDown = useMemoizedFn((input: NormalizedPointerEvent) => {
    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return;
    if (!input.canvasPoint) return;
    isDrawing.current = true;

    const id = generateUUID();
    setDrawingId(id);

    const rect = {
      x: input.canvasPoint.x,
      y: input.canvasPoint.y,
      width: 0,
      height: 0,
      strokeWidth: graphConfig.strokeWidth,
      stroke: fillColor,
      opacity: graphConfig.opacity,
      fill: graphConfig.fill ? fillColor : '',
      scale: stageConfig.scale,
      id,
    };

    const { type, diagrams } = getDrawingTypes();
    setDrawingLayer({
      ...drawingLayer,
      [type]: [...drawingLayer[type], rect],
      diagrams: [...drawingLayer.diagrams, { id, type: diagrams }],
    });
  });

  const onRectInputMove = useMemoizedFn((input: NormalizedPointerEvent) => {
    const drawingLayer = getDrawingLayer();
    if (!isDrawing.current || !drawingLayer) return;
    if (!input.canvasPoint) return;

    const rects = drawingLayer.rects || [];
    let rect = rects[rects.length - 1];
    if (!rect) return;

    rect = {
      ...rect,
      width: input.canvasPoint.x - (rect.x ?? 0),
      height: input.canvasPoint.y - (rect.y ?? 0),
    };
    rects.splice(rects.length - 1, 1, rect);
    requestAnimationFrame(() => {
      setDrawingLayer({ ...drawingLayer, rects });
    });
  });

  const onEllipseInputDown = useMemoizedFn((input: NormalizedPointerEvent) => {
    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return;
    if (!input.canvasPoint) return;
    isDrawing.current = true;

    const id = generateUUID();
    setDrawingId(id);

    const ellipse = {
      x: input.canvasPoint.x,
      y: input.canvasPoint.y,
      width: 0,
      height: 0,
      strokeWidth: graphConfig.strokeWidth,
      stroke: fillColor,
      opacity: graphConfig.opacity,
      fill: graphConfig.fill ? fillColor : '',
      scale: stageConfig.scale,
      id: id,
      mouseX: input.canvasPoint.x,
      mouseY: input.canvasPoint.y,
    };

    const { type, diagrams } = getDrawingTypes();
    setDrawingLayer({
      ...drawingLayer,
      [type]: [...drawingLayer[type], ellipse],
      diagrams: [...drawingLayer.diagrams, { id, type: diagrams }],
    });
  });

  const onEllipseInputMove = useMemoizedFn((input: NormalizedPointerEvent) => {
    const drawingLayer = getDrawingLayer();
    if (!isDrawing.current || !drawingLayer) return;
    if (!input.canvasPoint) return;

    const ellipses = drawingLayer.ellipses || [];
    let ellipse = ellipses[ellipses.length - 1];
    if (!ellipse) return;

    const width = input.canvasPoint.x - (ellipse.mouseX ?? 0);
    const height = input.canvasPoint.y - (ellipse.mouseY ?? 0);
    const newX = (ellipse.mouseX ?? 0) + width / 2;
    const newY = (ellipse.mouseY ?? 0) + height / 2;

    ellipse = {
      ...ellipse,
      width: Math.abs(width),
      height: Math.abs(height),
      x: newX,
      y: newY,
    };

    ellipses.splice(ellipses.length - 1, 1, ellipse);
    requestAnimationFrame(() => {
      setDrawingLayer({ ...drawingLayer, ellipses });
    });
  });

  const onLineInputDown = useMemoizedFn((input: NormalizedPointerEvent) => {
    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return;
    if (!input.canvasPoint) return;

    let startX = input.canvasPoint.x;
    let startY = input.canvasPoint.y;
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
      pressure: [input.pressure || 0],
      suppress: false,
      scale: stageConfig.scale,
      fill: false,
    };

    const { type, diagrams } = getDrawingTypes();
    setDrawingLayer({
      ...drawingLayer,
      [type]: [...drawingLayer[type], line],
      diagrams: [...drawingLayer.diagrams, { id, type: diagrams }],
    });
  });

  const onLineInputMove = useMemoizedFn((input: NormalizedPointerEvent) => {
    const drawingLayer = getDrawingLayer();
    if (!isDrawing.current || !drawingLayer) return;
    if (!input.canvasPoint) return;

    const lines = drawingLayer.lines || [];
    let line = lines[lines.length - 1];
    if (!line) return;

    line = {
      ...line,
      points: [line.points[0], line.points[1], input.canvasPoint.x, input.canvasPoint.y],
    };
    lines.splice(lines.length - 1, 1, line);
    requestAnimationFrame(() => {
      setDrawingLayer({ ...drawingLayer, lines });
    });
  });

  const onFillMouseDown = useMemoizedFn(async (e: Konva.KonvaEventObject<MouseEvent>) => {
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
        visible: true,
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
  });

  /**
   * 输入兼容层入口：把 Konva 事件标准化成 NormalizedPointerEvent。
   * 后续可以把所有“设备差异/坐标换算/pressure/buttons”都收口到这里，业务绘制逻辑只消费标准事件。
   */
  const toInputEvent = useMemoizedFn(
    (e: Konva.KonvaEventObject<MouseEvent>, phase: NormalizedPointerEvent['phase']) => {
      return normalizeKonvaPointerEvent(e, phase, layerConfig, stageConfig);
    }
  );

  //drawing layer
  const handleMouseDown = useMemoizedFn((e: Konva.KonvaEventObject<MouseEvent>) => {
    const input = toInputEvent(e, 'down');
    if (isMultiTouchRef.current && input.pointerType === 'touch') return;
    if (!input.isPrimaryButton || stageDraggable) return;
    if (!isPointInCanvasBounds(input.stagePoint, layerConfig)) return;

    switch (activeKey) {
      case Actions.ERASER:
      case Actions.PEN:
        return onPenInputDown(input);
      case Actions.RECT:
        return onRectInputDown(input);
      case Actions.ELLIPSE:
        return onEllipseInputDown(input);
      case Actions.LINE:
        return onLineInputDown(input);
      case Actions.FILL:
        return onFillMouseDown(e);
      default:
        break;
    }
  });

  const handleMouseMove = useMemoizedFn((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    if (!cursorVisible) setCursorVisible(true);
    if (stageDraggable) return;
    const input = toInputEvent(e, 'move');
    if (isMultiTouchRef.current && input.pointerType === 'touch') return;
    if (!isPointInCanvasBounds(input.stagePoint, layerConfig)) return;
    switch (activeKey) {
      case Actions.PEN:
      case Actions.ERASER:
        return onPenInputMove(input);
      case Actions.RECT:
        return onRectInputMove(input);
      case Actions.ELLIPSE:
        return onEllipseInputMove(input);
      case Actions.LINE:
        return onLineInputMove(input);
      default:
        break;
    }
  });

  // points 存的是 [x1,y1,x2,y2,...]，这里按“点”（pair）计数
  const getPointCount = (points: number[]) => {
    return Math.floor(points.length / 2);
  };

  const discardLastStrokeIfTooShort = useMemoizedFn(() => {
    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return false;

    const { type, diagrams } = getDrawingTypes();
    const arr = drawingLayer[type] as any[];
    if (!arr?.length) return false;

    const last = arr[arr.length - 1] as { id?: string; points?: number[] } | undefined;
    const points = last?.points ?? [];
    const pointCount = getPointCount(points);

    // 少于 6 个点：丢弃本次 stroke（不入历史、不留点）
    if (pointCount < 6) {
      const newArr = arr.slice(0, -1);
      const newDiagrams = [...drawingLayer.diagrams];
      const lastDiagram = newDiagrams[newDiagrams.length - 1];
      if (lastDiagram && last?.id && lastDiagram.id === last.id && lastDiagram.type === diagrams) {
        newDiagrams.pop();
      }
      setDrawingLayer({ ...(drawingLayer as any), [type]: newArr, diagrams: newDiagrams });
      isDrawing.current = false;
      setDrawingId(null);
      return true;
    }

    return false;
  });

  const handleMouseUp = useMemoizedFn((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    const input = toInputEvent(e, 'up');
    if (isMultiTouchRef.current && input.pointerType === 'touch') return;
    switch (activeKey) {
      case Actions.PEN:
      case Actions.ERASER:
        // 点太少直接丢弃，不入历史
        if (discardLastStrokeIfTooShort()) return;
        return pushDrawingHistory();
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

  const handleMouseLeave = useMemoizedFn((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    setCursorVisible(false);
  });

  return (
    <>
      <Stage
        ref={stageRef}
        style={{
          cursor: cursorStyle,
          position: 'relative',
          isolation: 'isolate',
          // 允许我们在 iPad 上接管双指手势（否则 Safari 会缩放页面）
          touchAction: 'none',
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
        onTouchStart={onStageTouchStart}
        onTouchMove={onStageTouchMove}
        onTouchEnd={onStageTouchEnd}
        onTouchCancel={onStageTouchEnd}
        onPointerDown={handleMouseDown}
        onPointerMove={handleMouseMove}
        onPointerUp={handleMouseUp}
        onPointerLeave={handleMouseLeave}
      >
        <Mosic />

        {renderOrderLayers.map((layer) => {
          const isDrawingLayer = topLayer?.id === layer.id;
          if (isDrawingLayer) {
            return (
              <React.Fragment key={`drawing-${layer.id}`}>
                <DrawLayer key={layer.id + 'drawing'} />
                {!!layer && <Layer key={layer.id} {...layer} />}
              </React.Fragment>
            );
          }
          return !!layer && <Layer key={layer.id} {...layer} />;
        })}
      </Stage>
      <Cursor visible={cursorVisible} />
      {tools?.includes(Tools.TOOL) && <Tool />}
      {tools?.includes(Tools.LAYERS_CONTROL) && <LayersControl />}
      {tools?.includes(Tools.FLEXIBLE) && <Flexible init={init} />}
    </>
  );
};

export default Drawing;
