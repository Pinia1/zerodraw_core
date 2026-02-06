import { PictureOutlined } from '@ant-design/icons';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { useHover, useMemoizedFn } from '@zeroDraw/common';
import { memo, useMemo, useRef } from 'react';
import styled from 'styled-components';

interface ImageNodeData {
  label?: string;
  src?: string;
  width?: number;
  height?: number;
  name?: string;
  [key: string]: unknown;
}

const Wrapper = styled.div<{ $selected: boolean }>`
  position: relative;
  border: ${({ $selected }) => ($selected ? '1px solid #1677ff' : '1px solid transparent')};
  cursor: grab;
  user-select: none;
`;

const ImageContainer = styled.div<{ $width: number; $height: number }>`
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    pointer-events: none;
  }
`;

const Placeholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #bbb;
`;

const Label = styled.span`
  position: absolute;
  top: 0;
  transform: translateY(-120%);
  color: #0958d9;
  font-size: 12px;
  white-space: nowrap;
`;

// 四个角的拖拽手柄
type Corner = 'tl' | 'tr' | 'bl' | 'br';

const cornerCursors: Record<Corner, string> = {
  tl: 'nw-resize',
  tr: 'ne-resize',
  bl: 'sw-resize',
  br: 'se-resize',
};

const cornerPositions: Record<
  Corner,
  { top?: number; bottom?: number; left?: number; right?: number }
> = {
  tl: { top: -3, left: -3 },
  tr: { top: -3, right: -3 },
  bl: { bottom: -3, left: -3 },
  br: { bottom: -3, right: -3 },
};

const ResizeHandle = styled.div<{ $corner: Corner }>`
  position: absolute;
  width: 6px;
  height: 6px;
  background: #fff;
  border: 1px solid #1677ff;
  border-radius: 2px;
  z-index: 10;
  cursor: ${({ $corner }) => cornerCursors[$corner]};
  ${({ $corner }) => {
    const pos = cornerPositions[$corner];
    return Object.entries(pos)
      .map(([k, v]) => `${k}: ${v}px;`)
      .join(' ');
  }}
`;

const MIN_SIZE = 40;

function ImageNode({ id, data, selected }: NodeProps) {
  const { src = '/zero.png', width = 119, height = 117, name = '' } = data as ImageNodeData;
  const { getNode, setNodes, getZoom } = useReactFlow();
  const ref = useRef<HTMLDivElement>(null);
  const isHover = useHover(ref);

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

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

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
          ratio: r,
          zoom,
        } = state;

        // 屏幕像素 → 画布坐标：除以 zoom
        const dx = (ev.clientX - startX) / zoom;
        const dy = (ev.clientY - startY) / zoom;

        let newW: number;
        let newH: number;

        // 根据拖拽角，用对角线方向的分量来决定缩放量
        // tl/br 用 (dx + dy)，tr/bl 用 (dx - dy)，再除以 2 取平均
        switch (c) {
          case 'br':
            newW = startW + ((dx + dy) * r) / (r + 1);
            break;
          case 'tl':
            newW = startW - ((dx + dy) * r) / (r + 1);
            break;
          case 'tr':
            newW = startW + ((dx - dy) * r) / (r + 1);
            break;
          case 'bl':
            newW = startW - ((dx - dy) * r) / (r + 1);
            break;
          default:
            newW = startW;
        }

        // 限制最小尺寸，保持宽高比
        newW = Math.max(MIN_SIZE, Math.round(newW));
        newH = Math.max(MIN_SIZE, Math.round(newW / r));
        // 如果高度被 MIN_SIZE 限制了，反算宽度
        newW = Math.round(newH * r);

        // 计算节点位置偏移，让对角固定
        let offsetX = 0;
        let offsetY = 0;
        if (c === 'tl') {
          offsetX = startW - newW;
          offsetY = startH - newH;
        } else if (c === 'tr') {
          offsetY = startH - newH;
        } else if (c === 'bl') {
          offsetX = startW - newW;
        }
        // br: 右下角拖拽，左上角不动，无偏移

        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== id) return n;
            return {
              ...n,
              position: {
                x: startNodeX + offsetX,
                y: startNodeY + offsetY,
              },
              data: { ...n.data, width: newW, height: newH },
            };
          })
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

  const handleStyle = useMemo(() => {
    return {
      width: 6,
      height: 6,
      background: '#fff',
      border: '1px solid #722ed1',
      opacity: selected ? 1 : 0,
    };
  }, [selected]);

  return (
    <Wrapper $selected={isHover || !!selected} ref={ref}>
      {!!selected && <Label>{name || 'Image'}</Label>}

      <ImageContainer $width={width} $height={height}>
        {src ? (
          <img src={src} alt={name} draggable={false} />
        ) : (
          <Placeholder>
            <PictureOutlined style={{ fontSize: 24 }} />
            <span style={{ fontSize: 11 }}>暂无图片</span>
          </Placeholder>
        )}
      </ImageContainer>

      <Handle type="source" position={Position.Right} style={handleStyle} />
      <Handle type="target" position={Position.Left} style={handleStyle} />

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
}

export default memo(ImageNode);
