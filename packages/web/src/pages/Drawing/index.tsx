import { useSize } from '@monorepo/common';
import { Drawing, Tools } from '@monorepo/core';
import { useRef } from 'react';

import styled from 'styled-components';

const Container = styled.div`
  width: 100%;
  height: 100vh;
  overflow: hidden;
`;

export default () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useSize(containerRef);

  return (
    <Container ref={containerRef}>{size && <Drawing size={size} tools={[Tools.TOOL]} />}</Container>
  );
};
