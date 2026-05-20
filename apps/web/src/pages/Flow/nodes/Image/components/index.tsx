import styled from 'styled-components';

export const Wrapper = styled.div<{ $selected: boolean }>`
  position: relative;
  border: ${({ $selected }) => ($selected ? '1px solid #1677ff' : '1px solid transparent')};
  cursor: grab;
  user-select: none;
`;

export const ImageContainer = styled.div<{ $width: number; $height: number }>`
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;

  .ant-image-cover {
    display: none;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    pointer-events: none;
  }
`;

export const Placeholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #bbb;
  position: relative;
  font-size: 10px;
`;

export const ToolbarWrapper = styled.div<{ $zoom: number }>`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) scale(${({ $zoom }) => 1 / $zoom});
  transform-origin: center bottom;
  margin-bottom: ${({ $zoom }) => 20 / $zoom}px;
  z-index: 10;
  pointer-events: auto;
  transition: all 0.5s ease-in-out;
`;

// 四个角的拖拽手柄
export type Corner = 'tl' | 'tr' | 'bl' | 'br';

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

export const ResizeHandle = styled.div<{ $corner: Corner }>`
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
