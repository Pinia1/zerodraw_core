import { useMount } from '@zeroDraw/common';
import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import { CANVAS_CONTAINER_ID } from '../../utils/drawing';
import { isMobile } from '../../utils/platform';
import Container from '../Container';
import { StyledTabs } from '../Layers';
import Lib from '../Lib';
import CreateWithAI from './components/CreateWithAI';

const Prompt: React.FC = () => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { shrinkTools } = useDrawingStore(
    useShallow((state) => ({
      shrinkTools: state.shrinkTools,
    }))
  );

  useMount(() => {
    const el =
      (document.getElementById(CANVAS_CONTAINER_ID) as HTMLElement | null) || document.body;
    setContainer(el);
  });

  if (!container) return null;

  return ReactDOM.createPortal(
    <Container
      ref={panelRef}
      style={{
        position: 'absolute',
        right: 12,
        top: 80,
        height: 'calc(100% - 170px)',
        width: 250,
        borderRadius: 16,
        padding: 12,
        fontSize: 14,
        display: shrinkTools ? 'none' : 'block',
        cursor: 'default',
        transformOrigin: 'left top',
        transform: isMobile ? 'scale(0.7)' : 'scale(1)',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <StyledTabs
        styles={{
          content: {
            height: '100%',
            outline: 'none',
          },
        }}
        style={{ height: '100%' }}
        defaultActiveKey="1"
        items={[
          {
            key: 'Modify',
            label: 'Modify',
            children: <CreateWithAI />,
          },
          {
            key: 'History',
            label: 'History',
            children: <Lib />,
          },
        ]}
      />
    </Container>,
    container
  );
};

export default React.memo(Prompt);
