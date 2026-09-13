import { useReactFlow } from '@xyflow/react';
import { useMemoizedFn } from '@zeroDraw/common';
import { useRef } from 'react';
import type { Corner } from './nodeLayout';

interface UseNodeResizeOptions {
  id: string;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  keepAspectRatio?: boolean;
}

export function useNodeResize({
  id,
  width,
  height,
  minWidth,
  minHeight,
  keepAspectRatio = false,
}: UseNodeResizeOptions) {
  const { getNode, setNodes, getZoom } = useReactFlow();

  const dragRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startNodeX: number;
    startNodeY: number;
    corner: Corner;
    ratio: number;
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
      ratio: width / height,
      zoom: getZoom(),
      rafId: null,
    };

    const onPointerMove = (ev: PointerEvent) => {
      const state = dragRef.current;
      if (!state) return;
      if (state.rafId !== null) cancelAnimationFrame(state.rafId);

      state.rafId = requestAnimationFrame(() => {
        const {
          startX,
          startY,
          startW,
          startH,
          startNodeX,
          startNodeY,
          corner: c,
          ratio,
          zoom,
        } = state;

        const dx = (ev.clientX - startX) / zoom;
        const dy = (ev.clientY - startY) / zoom;

        let newW = startW;
        let newH = startH;
        let offsetX = 0;
        let offsetY = 0;

        if (keepAspectRatio) {
          switch (c) {
            case 'br':
              newW = startW + ((dx + dy) * ratio) / (ratio + 1);
              break;
            case 'tl':
              newW = startW - ((dx + dy) * ratio) / (ratio + 1);
              break;
            case 'tr':
              newW = startW + ((dx - dy) * ratio) / (ratio + 1);
              break;
            case 'bl':
              newW = startW - ((dx - dy) * ratio) / (ratio + 1);
              break;
            default:
              newW = startW;
          }
          newW = Math.max(minWidth, Math.round(newW));
          newH = Math.max(minHeight, Math.round(newW / ratio));
          newW = Math.round(newH * ratio);

          if (c === 'tl') {
            offsetX = startW - newW;
            offsetY = startH - newH;
          } else if (c === 'tr') {
            offsetY = startH - newH;
          } else if (c === 'bl') {
            offsetX = startW - newW;
          }
        } else {
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

          newW = Math.max(minWidth, Math.round(newW));
          newH = Math.max(minHeight, Math.round(newH));

          if (newW === minWidth && offsetX !== 0) offsetX = startW - minWidth;
          if (newH === minHeight && offsetY !== 0) offsetY = startH - minHeight;
        }

        setNodes((nds) =>
          nds.map((n) =>
            n.id !== id
              ? n
              : {
                  ...n,
                  position: { x: startNodeX + offsetX, y: startNodeY + offsetY },
                  data: { ...n.data, width: newW, height: newH },
                },
          ),
        );
      });
    };

    const onPointerUp = () => {
      if (dragRef.current?.rafId !== null) {
        cancelAnimationFrame(dragRef.current!.rafId!);
      }
      dragRef.current = null;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  });

  return onPointerDown;
}
