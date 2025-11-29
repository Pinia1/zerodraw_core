import { useMount } from '@monorepo/common';
import { Tabs, TabsProps } from 'antd';
import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import { CANVAS_CONTAINER_ID } from '../../utils/drawing';
import Container from '../Container';
import DragList from './DragList';

const Layers: React.FC = () => {
  const rootRef = useRef<HTMLElement | null>(null);

  useMount(() => {
    rootRef.current =
      (document.getElementById(CANVAS_CONTAINER_ID) as HTMLElement) || document.body;
  });

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: 'Layers',
      children: <DragList />,
    },
    {
      key: '2',
      label: 'Assets',
      children: 'Content of Tab Pane 2',
    },
  ];

  if (!rootRef.current) {
    return null;
  }

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
      }}
    >
      <Tabs style={{ height: '100%' }} defaultActiveKey="1" items={items} />
    </Container>,
    rootRef.current
  );
};

export default Layers;
