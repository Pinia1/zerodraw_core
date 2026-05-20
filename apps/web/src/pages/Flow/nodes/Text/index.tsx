import Compile, { PromptEditorRef } from '@/componenets/Compile';
import { SECTION_CURSOR_URL } from '@/componenets/Icons/text';
import { useFlowStore } from '@/store/useFlowStore';
import type { NodeProps } from '@xyflow/react';
import { useNodes, useReactFlow, useViewport } from '@xyflow/react';
import { useHover, useMemoizedFn } from '@zeroDraw/common';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createGlobalStyle } from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import { Actions } from '../../components/ToolBar/type';
import { Corner, ResizeHandle, ToolbarWrapper, Wrapper } from '../Image/components';
import TextTool from './components/Tool';

const DragCursorStyle = createGlobalStyle`
 .Flow-Container {
    cursor: ${SECTION_CURSOR_URL} !important;
  }
`;

const MIN_WIDTH = 120;
const MIN_HEIGHT = 40;

const TextNode: React.FC<NodeProps<TextNode>> = (props) => {
  const { id, data, selected } = props;
  const {
    status,
    width = 240,
    height = 60,
  } = data as TextNode['data'] & { width?: number; height?: number };
  const { setNodes, screenToFlowPosition, getNode, getZoom } = useReactFlow();
  const { setToolActive } = useFlowStore(
    useShallow((state) => ({ setToolActive: state.setToolActive }))
  );

  const nodes = useNodes();
  const { zoom } = useViewport();

  const ref = useRef<HTMLDivElement>(null);
  const editorRef = useRef<PromptEditorRef>(null);
  const isHover = useHover(ref);
  const [focus, setFocus] = useState(false);

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

        // 被最小值限制时，不移动位置
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

  useEffect(() => {
    if (status !== 'drag') return;
    const pane = document.querySelector<HTMLElement>('.react-flow__pane');
    if (!pane) return;

    const handleMouseDown = (e: MouseEvent) => {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, position: pos, data: { ...n.data, status: 'empty' } } : n
        )
      );
      setToolActive(Actions.ROPE);
    };

    pane.addEventListener('mousedown', handleMouseDown);
    return () => {
      pane.removeEventListener('mousedown', handleMouseDown);
    };
  }, [status, id]);

  const multSelected = useMemo(() => {
    return nodes.filter((n) => n.selected).length > 1;
  }, [nodes]);

  if (status === 'drag') {
    return <DragCursorStyle />;
  }

  return (
    <Wrapper
      $selected={selected || isHover || focus}
      ref={ref}
      style={{ width, minHeight: height }}
    >
      {(focus || (selected && !multSelected)) && (
        <ToolbarWrapper $zoom={zoom}>
          <TextTool editor={editorRef.current?.editor ?? null} />
        </ToolbarWrapper>
      )}

      <Compile ref={editorRef} setFocus={setFocus} style={{ width: '100%', height: '100%' }} />

      {selected && (
        <>
          <ResizeHandle $corner="tl" onPointerDown={onPointerDown('tl')} />
          <ResizeHandle $corner="tr" onPointerDown={onPointerDown('tr')} />
          <ResizeHandle $corner="bl" onPointerDown={onPointerDown('bl')} />
          <ResizeHandle $corner="br" onPointerDown={onPointerDown('br')} />
        </>
      )}
    </Wrapper>
  );
};

export default React.memo(TextNode);
