import Icon from '@ant-design/icons';
import { useMount } from '@zeroDraw/common';
import { Button, Dropdown, Flex, Tabs, TabsProps } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import useCreateLayer from '../../hooks/useCreateLayer';
import useUpload from '../../hooks/useUpload';
import { IconAdd } from '../../icons';
import { useDrawingStore } from '../../store/useDrawing';
import useToolsStore from '../../store/useTools';
import { ASIDE_WIDTH, CANVAS_CONTAINER_ID, generateUUID } from '../../utils/drawing';
import { isMobile } from '../../utils/platform';
import Container from '../Container';
import DragList from './DragList';

export const StyledTabs = styled(Tabs)`
  .ant-tabs-content-holder {
    padding: 3px;
    overflow-y: auto;
    padding-bottom: 20px;
  }

  .ant-tabs-content {
    height: 100%;
  }
`;

function readScaleFromTransform(transform: string): number {
  if (!transform || transform === 'none') return 1;
  // matrix(a, b, c, d, tx, ty)
  if (transform.startsWith('matrix(')) {
    const parts = transform
      .slice('matrix('.length, -1)
      .split(',')
      .map((s) => Number.parseFloat(s.trim()));
    const [a, b] = parts;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
    const scaleX = Math.hypot(a, b);
    return Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1;
  }
  // matrix3d(...) scaleX=m11, scaleY=m22
  if (transform.startsWith('matrix3d(')) {
    const parts = transform
      .slice('matrix3d('.length, -1)
      .split(',')
      .map((s) => Number.parseFloat(s.trim()));
    const m11 = parts[0];
    const m22 = parts[5];
    const scaleX = Number.isFinite(m11) ? Math.abs(m11) : 1;
    const scaleY = Number.isFinite(m22) ? Math.abs(m22) : 1;
    // 取一个更稳的值（通常两者相等）
    const s = (scaleX + scaleY) / 2;
    return Number.isFinite(s) && s > 0 ? s : 1;
  }
  return 1;
}

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
    return [{ key: '1', label: 'Layers', children: <DragList panelScale={panelScale} /> }];
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
        <StyledTabs style={{ height: '100%' }} defaultActiveKey="1" items={tabsItems} />
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
