import Icon from '@ant-design/icons';
import { IconAdd } from '@core/icons';
import { useMount } from '@zeroDraw/common';
import { Button, Dropdown, Flex, Tabs, TabsProps } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import useCreateLayer from '../../hooks/useCreateLayer';
import useUpload from '../../hooks/useUpload';
import { useDrawingStore } from '../../store/useDrawing';
import useToolsStore from '../../store/useTools';
import { readScaleFromTransform } from '../../utils';
import { ASIDE_WIDTH, CANVAS_CONTAINER_ID, generateUUID } from '../../utils/drawing';
import { isMobile } from '../../utils/platform';
import Container from '../Container';
import Assets from './Assets';
import DragList from './DragList';

export const StyledTabs = styled(Tabs)`
  .ant-tabs-content-holder {
    padding: 3px;
    overflow-y: auto;
    padding-bottom: 20px;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: #d9d9d9;
      border-radius: 3px;

      &:hover {
        background: #bfbfbf;
      }
    }
  }

  .ant-tabs-content {
    height: 100%;
  }
`;

const Layers: React.FC = () => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelScale, setPanelScale] = useState(1);
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
    local: true,
    onSuccess: ({ url }) => {
      setReferencePicture(url);
    },
  });

  useMount(() => {
    const el =
      (document.getElementById(CANVAS_CONTAINER_ID) as HTMLElement | null) || document.body;
    setContainer(el);
  });

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    const t = window.getComputedStyle(el).transform;
    const s = readScaleFromTransform(t);
    setPanelScale(s);
  }, [container, shrinkTools]);

  const tabsItems: TabsProps['items'] = useMemo(() => {
    return [
      { key: 'Layers', label: 'Layers', children: <DragList panelScale={panelScale} /> },
      { key: 'assets', label: 'Assets', children: <Assets /> },
    ];
  }, [panelScale]);

  const handleCreateLayer = () => {
    createLayerRun(generateUUID());
  };

  if (!container) return null;

  return ReactDOM.createPortal(
    <Container
      ref={panelRef}
      style={{
        position: 'absolute',
        left: 12,
        top: 70,
        height: isMobile ? 'calc(100% )' : 'calc(100% - 140px)',
        width: ASIDE_WIDTH,
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
      <Flex style={{ position: 'relative', height: '100%' }}>
        <StyledTabs
          style={{ height: '100%', width: '100%' }}
          defaultActiveKey="Layers"
          items={tabsItems}
        />
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
