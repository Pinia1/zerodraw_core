import { useSize } from '@zeroDraw/common';
import { Drawing, Tools } from '@zeroDraw/core';
import { useRef } from 'react';

import styled from 'styled-components';

const Container = styled.div`
  width: 100%;
  height: 100vh;
  overflow: hidden;
`;

const DrawingPage = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useSize(containerRef);

  return (
    <Container ref={containerRef}>
      {size && <Drawing size={size} tools={[Tools.TOOL, Tools.LAYERS_CONTROL, Tools.FLEXIBLE]} />}
    </Container>
  );
};

export default DrawingPage;
