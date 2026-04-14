import { hexToRgba, useMemoizedFn, useMount } from '@zeroDraw/common';
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
import Prompt from '../components/Prompt';
import ReferencePicture from '../components/ReferencePicture';
import Tool from '../components/Tool';
import useBindStageRef from '../hooks/useBindRef';
import useDrawingKeyboard from '../hooks/useKeyboard';
import { useWheelLayerCache } from '../hooks/useWheelLayerCache';
import {
  isPointInCanvasBounds,
  normalizeKonvaPointerEvent,
} from '../input/normalizeKonvaPointerEvent';
import type { NormalizedPointerEvent } from '../input/types';
import { setCurrentProject } from '../local/indexDb';
import { useDrawingStore } from '../store/useDrawing';
import { useFillStore } from '../store/useFill';
import useHitStore from '../store/useHit';
import useLayerStore from '../store/useLayer';
import useToolsStore from '../store/useTools';
import type { Point2D } from '../types/Drawing';
import { Actions, EraserConfigTypes, GroupPos, LassoMode, LineConfigTypes } from '../types/Drawing';
import type {
  Diagram,
  DrawLayer as DrawLayerType,
  Ellipse as EllipseType,
  Fill as FillType,
  Lasso,
  Layers,
  Line,
  Rect as RectType,
} from '../types/Layers';
import {
  ASIDE_WIDTH,
  CANVAS_CONTAINER_ID,
  generateUUID,
  getTouchCenterAndDistance,
  MAX_SCALE,
  MIN_POINT,
  MIN_SCALE,
  PROMPT_WIDTH,
  RATIO,
  REDUCE_SCALE,
  WIDTH,
} from '../utils/drawing';
import imageManager from '../utils/imageManager';
import {
  buildEllipseLassoPoints,
  buildRectLassoPoints,
  getPointCount,
  hasIntersection,
  lockSquareEndPoint,
  mergeLassos,
} from '../utils/Lasso';
import { isMac, isMobile, isWindows } from '../utils/platform';
import ActiveDiagram, { ActiveDiagramRef } from './components/ActiveDiagram';
import DrawLayer from './components/DrawLayer';
import Layer from './components/Layer';
import Mosic from './components/Mosic';
import Thumbnail from './components/Thumbnail';

type WheelEventWithWheelDeltaY = WheelEvent & { wheelDeltaY?: number };

const Drawing: React.FC<DrawingProps> = (props) => {
  const { size, tools = Tools.TOOL, canvasWidth, canvasHeight, initialImageFile } = props;
  const stageRef = useBindStageRef();
  const isDrawing = useRef<boolean>(false);
  const lassoStartRef = useRef<Point2D | null>(null);
  const activeDiagramRef = useRef<ActiveDiagramRef | null>(null);

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
    lassoConfig,
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
      lassoConfig: state.lassoConfig,
      setDrawingId: state.setDrawingId,
      workerRef: state.workerRef,
    }))
  );

  const { setIsHit, hitIds } = useHitStore(
    useShallow((state) => ({
      setIsHit: state.setIsHit,
      hitIds: state.hitIds,
    }))
  );

  const { fillGradient } = useFillStore(
    useShallow((state) => ({
      fillGradient: state.gradient,
    }))
  );

  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );
  const {
    drawingVisible,
    setDrawingLayer,
    layers,
    initHistory,
    pushHistory,
    getDrawingLayer,
    drawingLayerId,
    hydrating,
    rehydrateFromStorage,
    flushStorageNow,
  } = useLayerStore(
    useShallow((state) => ({
      setDrawingLayer: state.setDrawingLayer,
      layers: state.layers,
      initHistory: state.initHistory,
      pushHistory: state.pushHistory,
      getDrawingLayer: state.getDrawingLayer,
      drawingLayerId: state.drawingLayer?.id,
      drawingVisible: state.drawingLayer?.visible,
      hydrating: state.hydrating,
      rehydrateFromStorage: state.rehydrateFromStorage,
      flushStorageNow: state.flushStorageNow,
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

  const prevSizeRef = useRef<{ width: number; height: number } | null>(null);

  const init = useMemoizedFn(() => {
    const ratio = canvasWidth && canvasHeight ? canvasWidth / canvasHeight : RATIO;
    const availableWidth = size.width - PROMPT_WIDTH - 80 - ASIDE_WIDTH;
    const availableHeight = size.height - 160;

    let initW = availableWidth;
    let initH = availableWidth / ratio;
    if (initH > availableHeight) {
      initH = availableHeight;
      initW = initH * ratio;
    }

    if (!layerConfig.width) {
      setLayerConfig({
        ...layerConfig,
        width: initW,
        height: initH,
        x: (size.width - PROMPT_WIDTH - initW + ASIDE_WIDTH) / 2,
        y: (size.height - initH) / 2,
      });
      setStageConfig({ scale: 1, x: 0, y: 0 });
    } else {
      let scale = availableWidth / layerConfig.width;
      if (layerConfig.height * scale > availableHeight) {
        scale = availableHeight / layerConfig.height;
      }
      const screenCenterX = (size.width - PROMPT_WIDTH + ASIDE_WIDTH) / 2;
      const layerX = screenCenterX / scale - layerConfig.width / 2;
      const layerY = size.height / (2 * scale) - layerConfig.height / 2;
      setLayerConfig({ ...layerConfig, x: layerX, y: layerY });
      setStageConfig({ scale, x: 0, y: 0 });
    }
    prevSizeRef.current = size;
  });

  const handleResize = useMemoizedFn((newSize: typeof size, prevSize: typeof size) => {
    const deltaX = (newSize.width - prevSize.width) / 2;
    const deltaY = (newSize.height - prevSize.height) / 2;
    setStageConfig({
      ...stageConfig,
      x: stageConfig.x + deltaX,
      y: stageConfig.y + deltaY,
    });
  });

  useEffect(() => {
    const prev = prevSizeRef.current;
    if (!prev) {
      prevSizeRef.current = size;
      return;
    }
    if (prev.width === size.width && prev.height === size.height) return;
    handleResize(size, prev);
    prevSizeRef.current = size;
  }, [size.width, size.height]);

  const commitActiveDiagramToLayer = useMemoizedFn((layer: Layers): Layers => {
    const active = activeDiagramRef.current?.activeDiagram;
    if (!active) return layer;

    const type = active.type;
    const id = (active.props as { id?: string } | null)?.id;

    if (!id) return layer;

    const exists = layer.diagrams?.some((d) => d.id === id);
    if (exists) return layer;

    switch (type) {
      case 'path':
        return {
          ...layer,
          paths: [...(layer.paths ?? []), active.props as unknown as Line],
          diagrams: [...(layer.diagrams ?? []), { id, type }],
        };
      case 'eraserLine':
        return {
          ...layer,
          eraserLines: [...(layer.eraserLines ?? []), active.props as unknown as Line],
          diagrams: [...(layer.diagrams ?? []), { id, type }],
        };
      case 'line':
        return {
          ...layer,
          lines: [...(layer.lines ?? []), active.props as unknown as Line],
          diagrams: [...(layer.diagrams ?? []), { id, type }],
        };
      case 'rect':
        return {
          ...layer,
          rects: [...(layer.rects ?? []), active.props as unknown as RectType],
          diagrams: [...(layer.diagrams ?? []), { id, type }],
        };
      case 'ellipse':
        return {
          ...layer,
          ellipses: [...(layer.ellipses ?? []), active.props as unknown as EllipseType],
          diagrams: [...(layer.diagrams ?? []), { id, type }],
        };
      case 'lasso':
        return {
          ...layer,
          lassos: [...(layer.lassos ?? []), active.props as unknown as Lasso],
          diagrams: [...(layer.diagrams ?? []), { id, type }],
        };
      case 'eraseLasso':
        return {
          ...layer,
          eraseLassos: [...(layer.eraseLassos ?? []), active.props as unknown as Lasso],
          diagrams: [...(layer.diagrams ?? []), { id, type }],
        };
      case 'fill':
        return {
          ...layer,
          fills: [...(layer.fills ?? []), active.props as unknown as FillType],
          diagrams: [...(layer.diagrams ?? []), { id, type }],
        };
      default:
        return layer;
    }
  });

  const pushDrawingHistory = () => {
    isDrawing.current = false;

    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return;

    const nextDrawingLayer = commitActiveDiagramToLayer(drawingLayer as unknown as Layers);

    const drawingIndex = layers.findIndex((l) => l.id === nextDrawingLayer.id);
    if (drawingIndex === -1) return;

    const newLayers = [...layers];
    newLayers[drawingIndex] = nextDrawingLayer;

    activeDiagramRef.current?.setActiveDiagram(null);
    setDrawingLayer(nextDrawingLayer);
    setDrawingId(null);
    pushHistory(newLayers);
  };

  const finishLasso = useMemoizedFn(() => {
    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return;

    const active = activeDiagramRef.current?.activeDiagram;
    const newStroke = active?.type === 'lasso' ? (active.props as unknown as Lasso) : null;
    if (!newStroke || !newStroke.points?.length) {
      activeDiagramRef.current?.setActiveDiagram(null);
      setDrawingId(null);
      return;
    }

    const lassos = drawingLayer.lassos ?? [];

    // 找到所有与新 stroke 有交集的 lassos（不包含新 stroke，因为它尚未写入 drawingLayer）
    const intersectingIndices: number[] = [];
    for (let i = 0; i < lassos.length; i++) {
      if (hasIntersection(lassos[i].points, newStroke.points)) {
        intersectingIndices.push(i);
      }
    }

    // 没有交集：REMOVE 不产生新选区；ADD 直接追加
    if (intersectingIndices.length === 0) {
      if ((newStroke.mode ?? LassoMode.ADD) === LassoMode.REMOVE) {
        activeDiagramRef.current?.setActiveDiagram(null);
        setDrawingId(null);
        return;
      }

      const nextDrawingLayer: Layers = {
        ...(drawingLayer as unknown as Layers),
        lassos: [...lassos, newStroke],
        diagrams: [...drawingLayer.diagrams, { id: newStroke.id, type: 'lasso' }],
      };

      setDrawingLayer(nextDrawingLayer);
      activeDiagramRef.current?.setActiveDiagram(null);
      setDrawingId(null);

      const drawingIndex = layers.findIndex((l) => l.id === nextDrawingLayer.id);
      if (drawingIndex === -1) return;
      const newLayers = [...layers];
      newLayers[drawingIndex] = nextDrawingLayer;
      pushHistory(newLayers);
      return;
    }

    const toMerge = intersectingIndices
      .map((idx) => ({
        points: lassos[idx].points,
        mode: lassos[idx].mode ?? LassoMode.ADD,
      }))
      .concat([{ points: newStroke.points, mode: newStroke.mode ?? LassoMode.ADD }]);

    const mergedPoints = mergeLassos(toMerge);

    // 移除被合并的 lassos
    const removedIds = new Set(intersectingIndices.map((idx) => lassos[idx].id));
    const keptLassos = lassos.filter((_, idx) => !intersectingIndices.includes(idx));
    const keptDiagrams = drawingLayer.diagrams.filter((d) => !removedIds.has(d.id));

    const nextLassos: Lasso[] = [...keptLassos];
    const nextDiagrams = [...keptDiagrams];

    if (mergedPoints.length >= 4) {
      const mergedId = generateUUID();
      nextLassos.push({
        id: mergedId,
        points: mergedPoints,
        stroke: fillColor,
        scale: stageConfig.scale,
        mode: LassoMode.ADD, // 合并后的结果统一为 ADD
      });
      nextDiagrams.push({ id: mergedId, type: 'lasso' });
    }

    const nextDrawingLayer: Layers = {
      ...(drawingLayer as unknown as Layers),
      lassos: nextLassos,
      diagrams: nextDiagrams,
    };

    setDrawingLayer(nextDrawingLayer);
    activeDiagramRef.current?.setActiveDiagram(null);
    setDrawingId(null);

    const drawingIndex = layers.findIndex((l) => l.id === nextDrawingLayer.id);
    if (drawingIndex === -1) return;
    const newLayers = [...layers];
    newLayers[drawingIndex] = nextDrawingLayer;
    pushHistory(newLayers);
  });

  const finishLine = useMemoizedFn(() => {
    if (activeKey !== Actions.LINE) return;

    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return;

    if (isDrawing.current) {
      isDrawing.current = false;
      setDrawingId(null);
    }

    const active = activeDiagramRef.current?.activeDiagram;
    if (active?.type === 'line') {
      const props = active.props as Line;
      const id = props.id;
      const pts = props.points ?? [];

      const nextPoints = pts.length >= 4 ? pts.slice(0, -2) : pts;

      if (id) {
        const exists = drawingLayer.diagrams?.some((d) => d.id === id);
        const nextLayer: Layers = exists
          ? {
              ...drawingLayer,
              lines: (drawingLayer.lines ?? []).map((l) =>
                l.id === id ? { ...l, points: nextPoints } : l
              ),
            }
          : {
              ...drawingLayer,
              lines: [...(drawingLayer.lines ?? []), { ...props, points: nextPoints }],
              diagrams: [...(drawingLayer.diagrams ?? []), { id, type: 'line' }],
            };

        setDrawingLayer(nextLayer);
      }

      activeDiagramRef.current?.setActiveDiagram(null);
      return;
    }
  });

  const cursorStyle = useMemo(() => {
    if (stageDraggable) return 'grab';
    if (!drawingVisible) return 'not-allowed';
    switch (activeKey) {
      case Actions.RECT:
      case Actions.LINE:
      case Actions.PEN:
      case Actions.ELLIPSE:
      case Actions.REMOVE:
        return 'crosshair';
      case Actions.FILL:
      case Actions.ERASER:
        return 'none';
      default:
        break;
    }
    return 'default';
  }, [stageDraggable, activeKey, drawingVisible]);

  const createInitialImageLayer = useMemoizedFn(async (file: File) => {
    const blobUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = blobUrl;
    });
    if (!img.naturalWidth) return;

    const { width: cw, height: ch } = useDrawingStore.getState().layerConfig;
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight, 1);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;

    const fillId = generateUUID();
    const buffer = await file.arrayBuffer();
    await imageManager.saveImage(fillId, buffer, file.type || 'image/png');

    const fill: FillType = {
      id: fillId,
      x: (cw - w) / 2,
      y: (ch - h) / 2,
      width: w,
      height: h,
      img,
      src: blobUrl,
      maxWidth: img.naturalWidth,
      maxHeight: img.naturalHeight,
      visible: true,
    };

    const layer = useLayerStore.getState().layers[0];
    const updated: DrawLayerType = {
      ...layer,
      image: fill,
      diagrams: [{ id: fillId, type: 'image' }],
      version: generateUUID(),
    };
    useLayerStore.getState().setLayers([updated]);
    setDrawingLayer(updated);
  });

  useMount(() => {
    setCurrentProject(useDrawingStore.getState().currentProjectId);
    init();
    rehydrateFromStorage().then(async () => {
      if (initialImageFile && useLayerStore.getState().layers.length <= 1) {
        await createInitialImageLayer(initialImageFile);
      }
      initHistory();
    });
  });

  // 页面卸载前强制落盘
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushStorageNow();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flushStorageNow]);

  useDrawingKeyboard({
    isDrawing,
    setStageDraggable,
    finishLine,
  });

  const getGroupPos = (stage: Konva.Stage): GroupPos | null => {
    let pos: GroupPos | null = null;
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

        const base: Omit<GroupPos, 'imageData'> = {
          x: group.x - layerRect.x,
          y: group.y - layerRect.y,
          width: group.width,
          height: group.height,
          relativePos,
          pixelRatio,
        };
        const absPos = lastLayer.getAbsolutePosition();
        if (base.y <= 0) {
          base.y = group.y - absPos.y;
        }
        if (base.x <= 0) {
          base.x = group.x - absPos.x;
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
        pos = { ...base, imageData };
      }
    });

    return pos;
  };

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

  const {
    tick: handleWheelCacheTick,
    start: startInteractionCache,
    end: endInteractionCache,
    cancel: cancelInteractionCacheEnd,
  } = useWheelLayerCache(stageRef, {
    endWait: 220,
    topLayerId: topLayer?.id,
  });

  const onStageWheel = useMemoizedFn((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    handleWheelCacheTick();

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
      (isWindows && typeof (e.evt as WheelEventWithWheelDeltaY).wheelDeltaY === 'number');
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

  const onStageTouchStart = useMemoizedFn((e: Konva.KonvaEventObject<TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const touches = e.evt.touches;

    // 多指（>=2）视为手势：禁用绘制，防误触
    if (touches.length >= 2) {
      e.evt.preventDefault();
      isMultiTouchRef.current = true;

      cancelInteractionCacheEnd();
      startInteractionCache();

      stage.stopDrag();

      if (isDrawing.current) {
        const active = activeDiagramRef.current?.activeDiagram;
        const activeId = (active?.props as { id?: string } | null)?.id;

        // 1) overlay 直接清空（PEN/LINE/RECT/ELLIPSE/LASSO 现在都在 overlay）
        activeDiagramRef.current?.setActiveDiagram(null);

        // 2) 只有“实时写入 drawLayer”的工具（比如 ERASER）才需要从 drawLayer 精确移除当前这笔
        if (activeKey === Actions.ERASER && activeId) {
          const drawingLayer = getDrawingLayer();
          if (drawingLayer) {
            const { type } = getDrawingTypes(); // type 例如 'eraserLines'
            const list = (drawingLayer[type] as unknown as Array<{ id?: string }>) ?? [];
            const nextList = list.filter((it) => it?.id !== activeId);
            const nextDiagrams = (drawingLayer.diagrams ?? []).filter((d) => d.id !== activeId);

            if (
              nextList.length !== list.length ||
              nextDiagrams.length !== (drawingLayer.diagrams ?? []).length
            ) {
              setDrawingLayer({
                ...drawingLayer,
                [type]: nextList,
                diagrams: nextDiagrams,
              } as unknown as Layers);
            }
          }
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

      // iPad 手势结束：立即清理 cache，释放内存/显存
      endInteractionCache();
    }
  });

  const onDragStart = useMemoizedFn((e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    if (!stage || e.target !== stage) return;
    if (!stageDraggable) return;

    cancelInteractionCacheEnd();
    startInteractionCache();
  });

  const onDragEnd = useMemoizedFn((e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();

    if (!stage || e.target !== stage) return;
    if (!stageDraggable) return;

    // 拖拽结束立即清理 cache（释放内存/显存）
    endInteractionCache();

    setStageConfig({
      scale: stageConfig.scale,
      x: e.target.x(),
      y: e.target.y(),
    });
  });

  const getDrawingTypes = (): {
    diagrams: Diagram['type'];
    type: keyof Pick<
      Layers,
      'lines' | 'eraserLines' | 'rects' | 'ellipses' | 'paths' | 'lassos' | 'remove'
    >;
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
      case Actions.LASSO:
        return {
          diagrams: 'lasso',
          type: 'lassos',
        };

      case Actions.REMOVE:
        return {
          diagrams: 'remove',
          type: 'remove',
        };
      default:
        return {
          diagrams: 'line',
          type: 'lines',
        };
    }
  };

  const onPenInputDown = useMemoizedFn((input: NormalizedPointerEvent) => {
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
      stabilizer: isEraser ? 0 : (lineConfig.stabilizer ?? 0),
      hardness: isEraser ? 1 : (lineConfig.hardness ?? 1),
      tension: Math.max(!isEraser && lineConfig.stabilizer ? lineConfig.stabilizer / 4 : 0, 0.7),
      eraser: isEraser,
      id,
      pressure: [input.pressure || 0],
      suppress: lineConfig.suppress, //是否开启压感
      scale: stageConfig.scale,
      fill: !isEraser ? !!lineConfig.fill : false,
    };

    const { diagrams } = getDrawingTypes();

    activeDiagramRef.current?.setActiveDiagram({
      type: diagrams,
      props: line,
    });
  });

  const onPenInputMove = useMemoizedFn((input: NormalizedPointerEvent) => {
    if (!input.canvasPoint) return;

    const { diagrams } = getDrawingTypes();
    const lastLine = activeDiagramRef.current?.activeDiagram?.props as unknown as Line;
    if (!lastLine) return;

    const updatedLine: Line = {
      ...lastLine,
      points: [...lastLine.points, input.canvasPoint.x, input.canvasPoint.y],
      pressure: [...lastLine.pressure, input.pressure || 0],
    };

    if (activeKey === Actions.ERASER) {
      const drawingLayer = getDrawingLayer();
      if (!drawingLayer) return;

      const eraserLines = drawingLayer.eraserLines ?? [];
      const idx = eraserLines.findIndex((l) => l.id === updatedLine.id);

      const nextEraserLines =
        idx >= 0
          ? eraserLines.map((l) => (l.id === updatedLine.id ? updatedLine : l))
          : [...eraserLines, updatedLine];

      const nextDiagrams = drawingLayer.diagrams.some((d) => d.id === updatedLine.id)
        ? drawingLayer.diagrams
        : [...drawingLayer.diagrams, { id: updatedLine.id, type: 'eraserLine' }];

      setDrawingLayer({
        ...drawingLayer,
        eraserLines: nextEraserLines,
        diagrams: nextDiagrams as Diagram[],
      });

      activeDiagramRef.current?.setActiveDiagram({
        type: diagrams,
        props: updatedLine,
      });

      return;
    }

    activeDiagramRef.current?.setActiveDiagram({
      type: diagrams,
      props: updatedLine,
    });
  });

  const onRectInputDown = useMemoizedFn((input: NormalizedPointerEvent) => {
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

    const { diagrams } = getDrawingTypes();

    activeDiagramRef.current?.setActiveDiagram({
      type: diagrams,
      props: rect,
    });
  });

  const onRectInputMove = useMemoizedFn((input: NormalizedPointerEvent) => {
    if (!input.canvasPoint) return;

    let rect = activeDiagramRef.current?.activeDiagram?.props as unknown as RectType;
    if (!rect) return;

    rect = {
      ...rect,
      width: input.canvasPoint.x - (rect.x ?? 0),
      height: input.canvasPoint.y - (rect.y ?? 0),
    };
    const { diagrams } = getDrawingTypes();
    activeDiagramRef.current?.setActiveDiagram({
      type: diagrams,
      props: rect,
    });
  });

  const onEllipseInputDown = useMemoizedFn((input: NormalizedPointerEvent) => {
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

    const { diagrams } = getDrawingTypes();

    activeDiagramRef.current?.setActiveDiagram({
      type: diagrams,
      props: ellipse,
    });
  });

  const onEllipseInputMove = useMemoizedFn((input: NormalizedPointerEvent) => {
    if (!input.canvasPoint) return;

    let ellipse = activeDiagramRef.current?.activeDiagram?.props as unknown as EllipseType;
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

    const { diagrams } = getDrawingTypes();
    activeDiagramRef.current?.setActiveDiagram({
      type: diagrams,
      props: ellipse,
    });
  });

  const onLineInputDown = useMemoizedFn((input: NormalizedPointerEvent) => {
    if (!input.canvasPoint) return;

    let startX = input.canvasPoint.x;
    let startY = input.canvasPoint.y;

    // 优先从 ActiveDiagram 里取（如果上一条还在 overlay 里），否则从 drawingLayer.lines 里取
    const prevActive = activeDiagramRef.current?.activeDiagram;
    if (prevActive?.type === 'line') {
      const prev = prevActive.props as { points?: number[] };
      const pts = prev.points ?? [];
      if (pts.length >= 4) {
        startX = pts[2];
        startY = pts[3];
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

    // 只更新 overlay
    const { diagrams } = getDrawingTypes();
    activeDiagramRef.current?.setActiveDiagram({
      type: diagrams,
      props: line,
    });
  });

  const onLineInputMove = useMemoizedFn((input: NormalizedPointerEvent) => {
    if (!input.canvasPoint) return;

    const active = activeDiagramRef.current?.activeDiagram;
    if (!active || active.type !== 'line') return;

    const last = active.props as Line;
    const next: Line = {
      ...last,
      points: [last.points[0], last.points[1], input.canvasPoint.x, input.canvasPoint.y],
    };

    activeDiagramRef.current?.setActiveDiagram({
      type: 'line',
      props: next,
    });
  });

  const onFillMouseDown = useMemoizedFn(async (e: Konva.KonvaEventObject<MouseEvent>) => {
    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return;
    try {
      const stage = e.target.getStage()!;
      const groupPos = getGroupPos(stage);
      if (!groupPos) return;

      const {
        imageData,
        relativePos: { x: posX, y: posY },
        pixelRatio,
      } = groupPos;
      const magnificationPosX = Math.round(posX * pixelRatio);
      const magnificationPosY = Math.round(posY * pixelRatio);
      const tolerance = 10;

      const fillStops = fillGradient.stops.map((s) => ({
        offset: s.offset,
        color: hexToRgba(s.color, lineConfig.opacity),
      }));

      const { buffer, id } = (await workerRef?.postMessage({
        imageData,
        posX: magnificationPosX,
        posY: magnificationPosY,
        tolerance,
        angleDeg: fillGradient.angle,
        stops: fillStops,
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

  const onLassoInputDown = useMemoizedFn((input: NormalizedPointerEvent) => {
    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return;
    if (!input.canvasPoint) return;

    isDrawing.current = true;
    lassoStartRef.current = input.canvasPoint;

    const id = generateUUID();
    setDrawingId(id);

    const getLassoEndPoint = (shape: typeof lassoConfig.shape, start: Point2D, end: Point2D) => {
      if (!input.shiftKey) return end;
      if (shape === 'rect' || shape === 'ellipse') return lockSquareEndPoint(start, end);
      return end;
    };
    const buildLassoPoints = (
      shape: typeof lassoConfig.shape,
      start: Point2D,
      end: Point2D,
      prevPoints: number[]
    ) => {
      if (shape === 'rect') return buildRectLassoPoints(start, end);
      if (shape === 'ellipse') return buildEllipseLassoPoints(start, end);
      return [...prevPoints, end.x, end.y];
    };

    const end = getLassoEndPoint(lassoConfig.shape, input.canvasPoint, input.canvasPoint);
    const initPoints = buildLassoPoints(lassoConfig.shape, input.canvasPoint, end, []);

    const line: Lasso = {
      points: initPoints,
      stroke: fillColor,
      id,
      scale: stageConfig.scale,
      mode: lassoConfig.type,
    };

    // 新方式：套索绘制期只写入 overlay（ActiveDiagram），mouseUp 再合并/提交到 drawLayer
    activeDiagramRef.current?.setActiveDiagram({
      type: 'lasso',
      props: line,
    });
  });

  const onLassoInputMove = useMemoizedFn((input: NormalizedPointerEvent) => {
    if (!input.canvasPoint) return;

    const active = activeDiagramRef.current?.activeDiagram;
    const lastLasso = active?.type === 'lasso' ? (active.props as unknown as Lasso) : null;
    if (!lastLasso) return;

    const start = lassoStartRef.current ?? input.canvasPoint;

    const getLassoEndPoint = (shape: typeof lassoConfig.shape, end: Point2D) => {
      if (!input.shiftKey) return end;
      if (shape === 'rect' || shape === 'ellipse') return lockSquareEndPoint(start, end);
      return end;
    };
    const buildLassoPoints = (
      shape: typeof lassoConfig.shape,
      end: Point2D,
      prevPoints: number[]
    ) => {
      if (shape === 'rect') return buildRectLassoPoints(start, end);
      if (shape === 'ellipse') return buildEllipseLassoPoints(start, end);
      return [...prevPoints, end.x, end.y];
    };

    const end = getLassoEndPoint(lassoConfig.shape, input.canvasPoint);
    const nextPoints = buildLassoPoints(lassoConfig.shape, end, lastLasso.points ?? []);

    const updatedLine: Lasso = { ...lastLasso, points: nextPoints };

    activeDiagramRef.current?.setActiveDiagram({
      type: 'lasso',
      props: updatedLine,
    });
  });

  const onRemoveInputDown = useMemoizedFn((input: NormalizedPointerEvent) => {
    if (!input.canvasPoint) return;

    isDrawing.current = true;

    const id = generateUUID();
    setDrawingId(id);
    setIsHit(true);

    const line: Line = {
      points: [input.canvasPoint.x, input.canvasPoint.y],
      strokeWidth: eraserConfig.strokeWidth,
      stroke: '#000000',
      opacity: 0.8,
      stabilizer: lineConfig.stabilizer ?? 0,
      hardness: 0.9,
      tension: lineConfig.stabilizer,
      eraser: false,
      id,
      pressure: [input.pressure || 0],
      suppress: false,
      scale: stageConfig.scale,
      fill: true,
    };

    const { diagrams } = getDrawingTypes();

    activeDiagramRef.current?.setActiveDiagram({
      type: diagrams,
      props: line,
    });
  });

  const onRemoveInputMove = useMemoizedFn((input: NormalizedPointerEvent) => {
    if (!input.canvasPoint) return;

    const { diagrams } = getDrawingTypes();
    const lastLine = activeDiagramRef.current?.activeDiagram?.props as unknown as Line;
    if (!lastLine) return;

    const MAX_POINTS = 100;

    const nextPoints = [...lastLine.points, input.canvasPoint.x, input.canvasPoint.y];
    const limitedPoints =
      nextPoints.length > MAX_POINTS
        ? nextPoints.slice(nextPoints.length - MAX_POINTS)
        : nextPoints;

    const updatedLine: Line = {
      ...lastLine,
      points: limitedPoints,
      pressure: [0],
    };
    activeDiagramRef.current?.setActiveDiagram({
      type: diagrams,
      props: updatedLine,
    });
  });
  const onRemoveInputUp = useMemoizedFn((_input: NormalizedPointerEvent) => {
    setIsHit(false);

    const drawingLayer = getDrawingLayer();
    if (!drawingLayer) return;

    const ids = new Set(hitIds);
    if (ids.size === 0) {
      activeDiagramRef.current?.setActiveDiagram(null);
      return;
    }

    const nextDrawingLayer = {
      ...(drawingLayer as unknown as Layers),

      lines: (drawingLayer.lines ?? []).filter((x) => !ids.has(x.id)),
      paths: (drawingLayer.paths ?? []).filter((x) => !ids.has(x.id)),
      rects: (drawingLayer.rects ?? []).filter((x) => !ids.has(x.id)),
      ellipses: (drawingLayer.ellipses ?? []).filter((x) => !ids.has(x.id)),
      eraserLines: (drawingLayer.eraserLines ?? []).filter((x) => !ids.has(x.id)),
      fills: (drawingLayer.fills ?? []).filter((x) => !ids.has(x.id)),
      lassos: (drawingLayer.lassos ?? []).filter((x) => !ids.has(x.id)),
      eraseLassos: (drawingLayer.eraseLassos ?? []).filter((x) => !ids.has(x.id)),
      diagrams: (drawingLayer.diagrams ?? []).filter((d) => !ids.has(d.id)),
    } as unknown as Layers;

    setDrawingLayer(nextDrawingLayer);
    const newLayers = layers.map((layer) =>
      layer.id !== (drawingLayer as any).id ? layer : (nextDrawingLayer as any)
    );
    pushHistory(newLayers);
    useHitStore.getState().setHitIds([]);
    activeDiagramRef.current?.setActiveDiagram(null);
    setDrawingId(null);
  });

  /**
   * 输入兼容层入口：把 Konva 事件标准化成 NormalizedPointerEvent。
   * “设备差异/坐标换算/pressure/buttons”都收口到这里，业务绘制逻辑只消费标准事件。
   */
  const toInputEvent = useMemoizedFn(
    (e: Konva.KonvaEventObject<MouseEvent>, phase: NormalizedPointerEvent['phase']) => {
      return normalizeKonvaPointerEvent(e, phase, layerConfig, stageConfig);
    }
  );

  //drawing layer
  const handleMouseDown = useMemoizedFn((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!drawingVisible) return;
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
      case Actions.LASSO:
        return onLassoInputDown(input);
      case Actions.REMOVE:
        return onRemoveInputDown(input);
      default:
        break;
    }
  });

  const handleMouseMove = useMemoizedFn((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!cursorVisible) setCursorVisible(true);
    if (stageDraggable) return;
    if (!isDrawing.current && !isMobile) return;
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
      case Actions.LASSO:
        return onLassoInputMove(input);
      case Actions.REMOVE:
        return onRemoveInputMove(input);
      default:
        break;
    }
  });

  const discardLastStrokeIfTooShort = useMemoizedFn(() => {
    const current = activeDiagramRef.current?.activeDiagram;
    const points = (current?.props as { points?: number[] } | null)?.points ?? [];

    if (!points.length) {
      activeDiagramRef.current?.setActiveDiagram(null);
      setDrawingId(null);
      return true;
    }

    if (activeKey === Actions.LASSO && lassoConfig.shape !== 'default') {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        const y = points[i + 1];
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }

      const w = Number.isFinite(minX) && Number.isFinite(maxX) ? maxX - minX : 0;
      const h = Number.isFinite(minY) && Number.isFinite(maxY) ? maxY - minY : 0;
      const MIN_SIZE = 6;

      const shouldDiscard = w < MIN_SIZE && h < MIN_SIZE;
      if (shouldDiscard) {
        activeDiagramRef.current?.setActiveDiagram(null);
        setDrawingId(null);
      }
      return shouldDiscard;
    }

    const pointCount = getPointCount(points);
    const shouldDiscard = pointCount < MIN_POINT;

    if (shouldDiscard) {
      activeDiagramRef.current?.setActiveDiagram(null);
      setDrawingId(null);
    }

    return shouldDiscard;
  });

  const handleMouseUp = useMemoizedFn((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    isDrawing.current = false;
    const input = toInputEvent(e, 'up');

    if (isMultiTouchRef.current && input.pointerType === 'touch') return;

    switch (activeKey) {
      case Actions.LASSO: {
        lassoStartRef.current = null;
        if (discardLastStrokeIfTooShort()) return;
        return finishLasso();
      }
      case Actions.PEN:
      case Actions.ERASER:
      case Actions.RECT:
      case Actions.ELLIPSE:
      case Actions.LINE:
        return pushDrawingHistory();
      case Actions.REMOVE:
        return onRemoveInputUp(input);
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

  if (hydrating) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.15)',
          zIndex: 9999,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 32,
              height: 32,
              margin: '0 auto 12px',
              border: '3px solid #e0e0e0',
              borderTopColor: '#666',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <div style={{ color: '#666', fontSize: 14 }}>loading…</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Stage
        ref={stageRef}
        style={{
          cursor: cursorStyle,
          position: 'relative',
          isolation: 'isolate',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
        id={CANVAS_CONTAINER_ID}
        width={size.width}
        height={size.height}
        x={stageConfig.x}
        y={stageConfig.y}
        scaleX={stageConfig.scale}
        scaleY={stageConfig.scale}
        draggable={stageDraggable}
        onContextMenu={handleContextMenu}
        onWheel={onStageWheel}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTouchStart={onStageTouchStart}
        onTouchMove={onStageTouchMove}
        onTouchEnd={onStageTouchEnd}
        onTouchCancel={onStageTouchEnd}
        onPointerDown={handleMouseDown}
        onPointerMove={handleMouseMove}
        onPointerLeave={handleMouseLeave}
        onPointerUp={handleMouseUp}
        onPointerCancel={handleMouseUp}
      >
        <Mosic />
        <Thumbnail />

        {renderOrderLayers.map((layer) => {
          const isDrawingLayer = drawingLayerId === layer.id;
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
        <ActiveDiagram ref={activeDiagramRef} />
      </Stage>
      <Cursor visible={cursorVisible} />
      <ReferencePicture />
      {tools?.includes(Tools.TOOL) && <Tool />}
      {tools?.includes(Tools.LAYERS_CONTROL) && <LayersControl />}
      {tools?.includes(Tools.LAYERS_CONTROL) && <Prompt />}
      {tools?.includes(Tools.FLEXIBLE) && <Flexible init={init} />}
    </>
  );
};

export default Drawing;
