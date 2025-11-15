import React from 'react';
import styled from 'styled-components';

const Eraser = styled.div`
  background-color: #fff;
  opacity: 0.9;
  border-radius: 50%;
  position: absolute;
  pointer-events: none;
  transform: translate(-50%, -50%);
  border: solid 2px #fff;
  z-index: 1;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
`;
const EraserCursor: React.FC<{
  r: number;
  x: number;
  y: number;
  style?: React.CSSProperties;
}> = ({ r, x, y, style }) => {
  return (
    <Eraser
      style={{
        top: `${y}px`,
        left: `${x}px`,
        width: `${r}px`,
        height: `${r}px`,
        ...style,
      }}
    />
  );
};

export default React.memo(EraserCursor);
