import Icon from '@ant-design/icons';
import { useMount } from '@zeroDraw/common';
import { Button, Dropdown, Flex, Tabs, TabsProps } from 'antd';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import useCreateLayer from '../../hooks/useCreateLayer';
import useUpload from '../../hooks/useUpload';
import { IconAdd } from '../../icons';
import { useDrawingStore } from '../../store/useDrawing';
import useToolsStore from '../../store/useTools';
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

  const { setReferencePicture } = useToolsStore(
    useShallow((state) => ({
      setReferencePicture: state.setReferencePicture,
    }))
  );

  const { run: createLayerRun } = useCreateLayer();

  const { run: createReferencePictureRun } = useUpload({
    accept: 'image/*',
    multiple: false,
    onSuccess: ({ url }) => {
      setReferencePicture(url);
    },
  });

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
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { label: 'Empty layer', key: 'layer', onClick: handleCreateLayer },
              { label: 'Reference picture', key: 'Reference', onClick: createReferencePictureRun },
            ],
          }}
        >
          <Button
            type="text"
            variant="link"
            style={{
              position: 'absolute',
              right: 0,
              transform: 'translateY(calc(17px - 50%))',
              fontSize: 14,
            }}
          >
            <Icon component={IconAdd} />
          </Button>
        </Dropdown>
      </Flex>
    </Container>,
    container
  );
};

export default React.memo(Layers);
