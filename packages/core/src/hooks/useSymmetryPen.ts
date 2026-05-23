import { useRef } from 'react';
import type { ActiveDiagramState } from '../Drawing/components/ActiveDiagram';
import useSymmetryStore from '../store/useSymmetry';
import type { Ellipse as EllipseType, Layers, Line, Rect as RectType } from '../types/Layers';
import { generateUUID } from '../utils/drawing';
import { reflectPoint } from '../utils/symmetry';

type SetMirror = (state: ActiveDiagramState | null) => void;

type ShapeType = 'rect' | 'ellipse' | 'line';

interface MirrorShape {
  type: ShapeType;
  anchor: { x: number; y: number };
  props: RectType | EllipseType | Line;
}

export function useSymmetryPen(setMirror: SetMirror) {
  //笔画 / 橡皮擦
  const mirrorLineRef = useRef<Line | null>(null);

  //图形工具 (rect / ellipse / line)
  const mirrorShapeRef = useRef<MirrorShape | null>(null);

  const isActive = () => useSymmetryStore.getState().mode !== 'Off';

  const getAxis = () => {
    const { position, rotation } = useSymmetryStore.getState();
    return { position, rotation };
  };

  const onDown = (originalLine: Line) => {
    if (!isActive()) {
      mirrorLineRef.current = null;
      setMirror(null);
      return;
    }
    const { position, rotation } = getAxis();
    const [ox, oy] = [originalLine.points[0], originalLine.points[1]];
    const mirrored = reflectPoint(ox, oy, position.x, position.y, rotation);

    const mirror: Line = {
      ...originalLine,
      id: generateUUID(),
      points: [mirrored.x, mirrored.y],
      pressure: [originalLine.pressure[0] ?? 0],
    };
    mirrorLineRef.current = mirror;
    setMirror({ type: originalLine.eraser ? 'eraserLine' : 'path', props: mirror });
  };

  const onMove = (x: number, y: number, pressure: number) => {
    if (!mirrorLineRef.current) return;
    const { position, rotation } = getAxis();
    const mirrored = reflectPoint(x, y, position.x, position.y, rotation);
    const updated: Line = {
      ...mirrorLineRef.current,
      points: [...mirrorLineRef.current.points, mirrored.x, mirrored.y],
      pressure: [...mirrorLineRef.current.pressure, pressure],
    };
    mirrorLineRef.current = updated;
    setMirror({ type: updated.eraser ? 'eraserLine' : 'path', props: updated });
  };

  const onRectDown = (rect: RectType) => {
    if (!isActive()) {
      mirrorShapeRef.current = null;
      setMirror(null);
      return;
    }
    const { position, rotation } = getAxis();
    const anchor = reflectPoint(rect.x, rect.y, position.x, position.y, rotation);
    const mirror: RectType = {
      ...rect,
      id: generateUUID(),
      x: anchor.x,
      y: anchor.y,
      width: 0,
      height: 0,
    };
    mirrorShapeRef.current = { type: 'rect', anchor, props: mirror };
    setMirror({ type: 'rect', props: mirror });
  };

  const onRectMove = (currentX: number, currentY: number) => {
    const s = mirrorShapeRef.current;
    if (!s || s.type !== 'rect') return;
    const { position, rotation } = getAxis();
    const mc = reflectPoint(currentX, currentY, position.x, position.y, rotation);
    const mirror: RectType = {
      ...(s.props as RectType),
      width: mc.x - s.anchor.x,
      height: mc.y - s.anchor.y,
    };
    mirrorShapeRef.current = { ...s, props: mirror };
    setMirror({ type: 'rect', props: mirror });
  };

  const onEllipseDown = (ellipse: EllipseType) => {
    if (!isActive()) {
      mirrorShapeRef.current = null;
      setMirror(null);
      return;
    }
    const { position, rotation } = getAxis();
    const anchor = reflectPoint(ellipse.mouseX, ellipse.mouseY, position.x, position.y, rotation);
    const mirror: EllipseType = {
      ...ellipse,
      id: generateUUID(),
      mouseX: anchor.x,
      mouseY: anchor.y,
      x: anchor.x,
      y: anchor.y,
      width: 0,
      height: 0,
    };
    mirrorShapeRef.current = { type: 'ellipse', anchor, props: mirror };
    setMirror({ type: 'ellipse', props: mirror });
  };

  const onEllipseMove = (currentX: number, currentY: number) => {
    const s = mirrorShapeRef.current;
    if (!s || s.type !== 'ellipse') return;
    const { position, rotation } = getAxis();
    const mc = reflectPoint(currentX, currentY, position.x, position.y, rotation);
    const w = mc.x - s.anchor.x;
    const h = mc.y - s.anchor.y;
    const mirror: EllipseType = {
      ...(s.props as EllipseType),
      x: s.anchor.x + w / 2,
      y: s.anchor.y + h / 2,
      width: Math.abs(w),
      height: Math.abs(h),
    };
    mirrorShapeRef.current = { ...s, props: mirror };
    setMirror({ type: 'ellipse', props: mirror });
  };

  const onLineDown = (line: Line) => {
    if (!isActive()) {
      mirrorShapeRef.current = null;
      setMirror(null);
      return;
    }
    const { position, rotation } = getAxis();
    const anchor = reflectPoint(line.points[0], line.points[1], position.x, position.y, rotation);
    const mirror: Line = {
      ...line,
      id: generateUUID(),
      points: [anchor.x, anchor.y, anchor.x, anchor.y],
    };
    mirrorShapeRef.current = { type: 'line', anchor, props: mirror };
    setMirror({ type: 'line', props: mirror });
  };

  const onLineMove = (currentX: number, currentY: number) => {
    const s = mirrorShapeRef.current;
    if (!s || s.type !== 'line') return;
    const { position, rotation } = getAxis();
    const mc = reflectPoint(currentX, currentY, position.x, position.y, rotation);
    const mirror: Line = {
      ...(s.props as Line),
      points: [s.anchor.x, s.anchor.y, mc.x, mc.y],
    };
    mirrorShapeRef.current = { ...s, props: mirror };
    setMirror({ type: 'line', props: mirror });
  };

  const onUp = () => {
    setMirror(null);
  };

  const commitToLayer = (layer: Layers): Layers => {
    let result = layer;

    const mirrorLine = mirrorLineRef.current;
    mirrorLineRef.current = null;
    if (mirrorLine) {
      const exists = result.diagrams?.some((d) => d.id === mirrorLine.id);
      if (!exists) {
        if (mirrorLine.eraser) {
          result = {
            ...result,
            eraserLines: [...(result.eraserLines ?? []), mirrorLine],
            diagrams: [
              ...(result.diagrams ?? []),
              { id: mirrorLine.id, type: 'eraserLine' as const },
            ],
          };
        } else {
          result = {
            ...result,
            paths: [...(result.paths ?? []), mirrorLine],
            diagrams: [...(result.diagrams ?? []), { id: mirrorLine.id, type: 'path' as const }],
          };
        }
      }
    }

    // 图形工具
    const mirrorShape = mirrorShapeRef.current;
    mirrorShapeRef.current = null;
    if (mirrorShape) {
      const id = (mirrorShape.props as { id: string }).id;
      const exists = result.diagrams?.some((d) => d.id === id);
      if (!exists) {
        switch (mirrorShape.type) {
          case 'rect':
            result = {
              ...result,
              rects: [...(result.rects ?? []), mirrorShape.props as RectType],
              diagrams: [...(result.diagrams ?? []), { id, type: 'rect' as const }],
            };
            break;
          case 'ellipse':
            result = {
              ...result,
              ellipses: [...(result.ellipses ?? []), mirrorShape.props as EllipseType],
              diagrams: [...(result.diagrams ?? []), { id, type: 'ellipse' as const }],
            };
            break;
          case 'line':
            result = {
              ...result,
              lines: [...(result.lines ?? []), mirrorShape.props as Line],
              diagrams: [...(result.diagrams ?? []), { id, type: 'line' as const }],
            };
            break;
        }
      }
    }

    return result;
  };

  return {
    onDown,
    onMove,
    onRectDown,
    onRectMove,
    onEllipseDown,
    onEllipseMove,
    onLineDown,
    onLineMove,
    onUp,
    commitToLayer,
  };
}
