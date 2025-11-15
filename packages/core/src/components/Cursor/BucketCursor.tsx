import styled from 'styled-components';
import { Water } from '../Icon';

const Eraser = styled.div`
  opacity: 0.9;
  border-radius: 50%;
  position: absolute;
  pointer-events: none;
  transform: translate(-50%, -50%);
  z-index: 1;
`;
const BucketCursor: React.FC<{
  x: number;
  y: number;
  style?: React.CSSProperties;
}> = ({ x, y, style }) => {
  return (
    <Eraser
      style={{
        top: `${y}px`,
        left: `${x}px`,
        ...style,
      }}
    >
      <Water />
    </Eraser>
  );
};

export default BucketCursor;
