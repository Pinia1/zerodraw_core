import Icon from '@ant-design/icons';
import { useMount } from '@monorepo/common';
import { Button, Flex, Tabs, TabsProps, Tooltip } from 'antd';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import useCreateLayer from '../../hooks/useCreateLayer';
import { IconAdd } from '../../icons';
import { useDrawingStore } from '../../store/useDrawing';
import { CANVAS_CONTAINER_ID, generateUUID } from '../../utils/drawing';
import { isMobile } from '../../utils/platform';
import Container from '../Container';
import DragList from './DragList';

const StyledTabs = styled(Tabs)`
  .ant-tabs-content-holder {
    padding: 3px;
    overflow-y: auto;
    padding-bottom: 20px;
  }
`;

const Layers: React.FC = () => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const { shrinkTools } = useDrawingStore(
    useShallow((state) => ({
      shrinkTools: state.shrinkTools,
    }))
  );

  const { run: createLayerRun } = useCreateLayer();
  useMount(() => {
    const el =
      (document.getElementById(CANVAS_CONTAINER_ID) as HTMLElement | null) || document.body;
    setContainer(el);
  });

  const items: TabsProps['items'] = [
    { key: '1', label: 'Layers', children: <DragList /> },
    { key: '2', label: 'Assets', children: 'Content of Tab Pane 2' },
  ];

  const handleCreateLayer = () => {
    createLayerRun(generateUUID());
  };

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
        cursor: 'default',
        transformOrigin: 'left top',
        transform: isMobile ? 'scale(0.7)' : 'scale(1)',
      }}
    >
      <Flex style={{ position: 'relative', height: '100%' }}>
        <StyledTabs style={{ height: '100%' }} defaultActiveKey="1" items={items} />
        <Button
          type="text"
          variant="link"
          style={{
            position: 'absolute',
            right: 0,
            transform: 'translateY(calc(17px - 50%))',
            fontSize: 14,
          }}
          onClick={handleCreateLayer}
        >
          <Tooltip title="New Layer">
            <Icon component={IconAdd} />
          </Tooltip>
        </Button>
      </Flex>
    </Container>,
    container
  );
};

export default React.memo(Layers);
