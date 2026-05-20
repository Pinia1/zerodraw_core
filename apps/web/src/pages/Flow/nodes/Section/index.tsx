import { SECTION_CURSOR_URL } from '@/componenets/Icons/text';
import { useFlowStore } from '@/store/useFlowStore';
import type { NodeProps } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { useHover, useMemoizedFn } from '@zeroDraw/common';
import React, { useEffect, useRef } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import { Actions } from '../../components/ToolBar/type';
import { Corner, ResizeHandle } from '../Image/components';

const DragCursorStyle = createGlobalStyle`
  .Flow-Container {
    cursor: ${SECTION_CURSOR_URL} !important;
  }
`;

const MIN_WIDTH = 100;
const MIN_HEIGHT = 60;

const SectionNode: React.FC<NodeProps<SectionNode>> = (props) => {
  const { id, data, selected } = props;
  const {
    status,
    width = 300,
    height = 200,
    label = 'Section',
  } = data as SectionNode['data'] & { width?: number; height?: number; label?: string };
  const { setNodes, screenToFlowPosition, getNode, getZoom } = useReactFlow();
  const { setToolActive } = useFlowStore(
    useShallow((state) => ({ setToolActive: state.setToolActive }))
  );

  const ref = useRef<HTMLDivElement>(null);
  const isHover = useHover(ref);

  // ===================== Resize 逻辑 =====================
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startNodeX: number;
    startNodeY: number;
    corner: Corner;
    zoom: number;
    rafId: number | null;
  } | null>(null);

  const onPointerDown = useMemoizedFn((corner: Corner) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const node = getNode(id);
    if (!node) return;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: width,
      startH: height,
      startNodeX: node.position.x,
      startNodeY: node.position.y,
      corner,
      zoom: getZoom(),
      rafId: null,
    };

    const onPointerMove = (ev: PointerEvent) => {
      const state = dragRef.current;
      if (!state) return;
      if (state.rafId !== null) cancelAnimationFrame(state.rafId);

      state.rafId = requestAnimationFrame(() => {
        const { startX, startY, startW, startH, startNodeX, startNodeY, corner: c, zoom } = state;
        const dx = (ev.clientX - startX) / zoom;
        const dy = (ev.clientY - startY) / zoom;

        let newW = startW;
        let newH = startH;
        let offsetX = 0;
        let offsetY = 0;

        if (c === 'br') {
          newW = startW + dx;
          newH = startH + dy;
        } else if (c === 'tl') {
          newW = startW - dx;
          newH = startH - dy;
          offsetX = dx;
          offsetY = dy;
        } else if (c === 'tr') {
          newW = startW + dx;
          newH = startH - dy;
          offsetY = dy;
        } else if (c === 'bl') {
          newW = startW - dx;
          newH = startH + dy;
          offsetX = dx;
        }

        newW = Math.max(MIN_WIDTH, Math.round(newW));
        newH = Math.max(MIN_HEIGHT, Math.round(newH));
        const clampedOffsetX = newW === MIN_WIDTH && offsetX !== 0 ? startW - MIN_WIDTH : offsetX;
        const clampedOffsetY = newH === MIN_HEIGHT && offsetY !== 0 ? startH - MIN_HEIGHT : offsetY;

        setNodes((nds) =>
          nds.map((n) =>
            n.id !== id
              ? n
              : {
                  ...n,
                  position: { x: startNodeX + clampedOffsetX, y: startNodeY + clampedOffsetY },
                  data: { ...n.data, width: newW, height: newH },
                }
          )
        );
      });
    };

    const onPointerUp = () => {
      if (dragRef.current?.rafId !== null) cancelAnimationFrame(dragRef.current!.rafId!);
      dragRef.current = null;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  });

  // ============== Drag 状态：在画布上拖拽绘制矩形 ==============
  useEffect(() => {
    if (status !== 'drag') return;
    const pane = document.querySelector<HTMLElement>('.react-flow__pane');
    if (!pane) return;

    let drawing = false;
    let startPos = { x: 0, y: 0 };
    let rafId: number | null = null;

    const handleMouseDown = (e: MouseEvent) => {
      drawing = true;
      startPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                position: startPos,
                data: { ...n.data, status: 'drawing', width: 0, height: 0 },
              }
            : n
        )
      );
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!drawing) return;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const currentPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const w = Math.abs(currentPos.x - startPos.x);
        const h = Math.abs(currentPos.y - startPos.y);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id ? { ...n, position: { x, y }, data: { ...n.data, width: w, height: h } } : n
          )
        );
      });
    };

    const handleMouseUp = () => {
      if (!drawing) return;
      drawing = false;
      if (rafId !== null) cancelAnimationFrame(rafId);

      setNodes((nds) => {
        const sectionNode = nds.find((n) => n.id === id);
        if (!sectionNode) return nds;

        const sw = (sectionNode.data as any).width || 0;
        const sh = (sectionNode.data as any).height || 0;

        // 太小就删除
        if (sw < 20 || sh < 20) {
          return nds.filter((n) => n.id !== id);
        }

        const sx = sectionNode.position.x;
        const sy = sectionNode.position.y;

        // 找出完全在矩形内的节点
        const childIds = new Set<string>();
        for (const n of nds) {
          if (n.id === id || n.type === 'section' || n.type === 'lib') continue;
          if (n.parentId) continue;
          const nw = (n.data as any).width || n.measured?.width || 120;
          const nh = (n.data as any).height || n.measured?.height || 60;
          if (
            n.position.x >= sx &&
            n.position.y >= sy &&
            n.position.x + nw <= sx + sw &&
            n.position.y + nh <= sy + sh
          ) {
            childIds.add(n.id);
          }
        }

        return nds.map((n) => {
          if (n.id === id) {
            return {
              ...n,
              data: { ...n.data, status: 'complete', width: sw, height: sh },
            };
          }
          if (childIds.has(n.id)) {
            return {
              ...n,
              parentId: id,
              extent: 'parent' as const,
              position: {
                x: n.position.x - sx,
                y: n.position.y - sy,
              },
            };
          }
          return n;
        });
      });

      setToolActive(Actions.ROPE);
    };

    pane.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      pane.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [status, id]);

  // ===================== 渲染 =====================

  if (status === 'drag') {
    return <DragCursorStyle />;
  }

  // 绘制中：半透明矩形预览
  if (status === 'drawing') {
    return <DrawingRect style={{ width, height }} />;
  }

  return (
    <SectionWrapper $selected={!!selected || isHover} ref={ref} style={{ width, height }}>
      <SectionHeader>{label}</SectionHeader>

      {selected && (
        <>
          <ResizeHandle $corner="tl" onPointerDown={onPointerDown('tl')} />
          <ResizeHandle $corner="tr" onPointerDown={onPointerDown('tr')} />
          <ResizeHandle $corner="bl" onPointerDown={onPointerDown('bl')} />
          <ResizeHandle $corner="br" onPointerDown={onPointerDown('br')} />
        </>
      )}
    </SectionWrapper>
  );
};

export default React.memo(SectionNode);

const DrawingRect = styled.div`
  background: rgba(22, 119, 255, 0.08);
  border: 1.5px dashed rgba(22, 119, 255, 0.5);
  border-radius: 12px;
  pointer-events: none;
`;

const SectionWrapper = styled.div<{ $selected: boolean }>`
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border: 1.5px solid ${({ $selected }) => ($selected ? '#1677ff' : 'rgba(255, 255, 255, 0.12)')};
  border-radius: 12px;
  min-width: ${MIN_WIDTH}px;
  min-height: ${MIN_HEIGHT}px;
`;

const SectionHeader = styled.div`
  position: absolute;
  top: -28px;
  left: 0;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  pointer-events: none;
  user-select: none;
`;
