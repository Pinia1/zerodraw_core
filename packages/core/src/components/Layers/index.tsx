import { useMount } from '@monorepo/common';
import { Tabs, TabsProps } from 'antd';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import { CANVAS_CONTAINER_ID } from '../../utils/drawing';
import Container from '../Container';
import DragList from './DragList';

const Layers: React.FC = () => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
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

  const items: TabsProps['items'] = [
    { key: '1', label: 'Layers', children: <DragList /> },
    { key: '2', label: 'Assets', children: 'Content of Tab Pane 2' },
  ];

  if (!container) return null;

  return ReactDOM.createPortal(
    <Container
      style={{
        position: 'absolute',
        left: 12,
        top: 80,
        height: 'calc(100% - 170px)',
        width: 250,
        borderRadius: 16,
        padding: 12,
        fontSize: 14,
        display: shrinkTools ? 'none' : 'block',
      }}
    >
      <Tabs style={{ height: '100%' }} defaultActiveKey="1" items={items} />
    </Container>,
    container
  );
};

export default React.memo(Layers);
