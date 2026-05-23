import Icon from '@ant-design/icons';
import { useMount } from '@zeroDraw/common';
import { Divider } from 'antd';
import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { IconAdd, IconFull, IconIncomplete, IconReduce, IconSuitable } from '@core/icons';
import { useDrawingStore } from '../../store/useDrawing';
import { ASIDE_WIDTH, CANVAS_CONTAINER_ID, WIDTH } from '../../utils/drawing';
import { isMobile } from '../../utils/platform';
import Container from '../Container';
import { ToolItem } from '../index';

interface FlexibleProps {
  init: () => void;
}

const Flexible: React.FC<FlexibleProps> = ({ init }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const { shrinkTools, setShrinkTools, layerConfig, stageConfig, setStageConfig } = useDrawingStore(
    useShallow((state) => ({
      shrinkTools: state.shrinkTools,
      setShrinkTools: state.setShrinkTools,
      layerConfig: state.layerConfig,
      stageConfig: state.stageConfig,
      setStageConfig: state.setStageConfig,
    }))
  );
  useMount(() => {
    const el =
      (document.getElementById(CANVAS_CONTAINER_ID) as HTMLElement | null) || document.body;
    setContainer(el);
  });

  const handlerScale = (type: 'add' | 'reduce') => {
    if (!container) return;
    const scaleBy = type === 'reduce' ? 0.92 : 1.08;
    const newScale = stageConfig.scale * scaleBy;
    const newX = container.clientWidth / 2 - (container.clientWidth / 2 - stageConfig.x) * scaleBy;
    const newY =
      container.clientHeight / 2 - (container.clientHeight / 2 - stageConfig.y) * scaleBy;
    setStageConfig({
      ...stageConfig,
      scale: newScale,
      x: newX,
      y: newY,
    });
  };

  const meuns = useMemo(() => {
    if (shrinkTools) {
      return [
        {
          key: 'full',
          icon: <Icon component={IconIncomplete} />,
          type: 'action',
          onClick: () => {
            setShrinkTools(false);
          },
        },
      ];
    }
    return [
      {
        key: 'full',
        icon: <Icon component={IconFull} />,
        type: 'action',
        onClick: () => {
          setShrinkTools(true);
        },
      },
      {
        key: 'suitable',
        icon: <Icon component={IconSuitable} />,
        type: 'action',
        onClick: () => {
          init();
        },
      },
      {
        key: 'divider',
        type: 'divider',
      },
      {
        key: 'reduce',
        icon: <Icon component={IconReduce} />,
        type: 'action',
        onClick: () => {
          handlerScale('reduce');
        },
      },
      {
        key: 'nums',
        icon: (
          <span
            style={{
              width: 48,
            }}
          >
            {Math.round((layerConfig.width / WIDTH) * stageConfig.scale * 100)}%
          </span>
        ),
        type: 'action',
        onClick: () => {},
      },
      {
        key: 'add',
        icon: <Icon component={IconAdd} />,
        type: 'action',
        onClick: () => {
          handlerScale('add');
        },
      },
    ];
  }, [shrinkTools, layerConfig, stageConfig, container]);

  if (!container) return null;

  return ReactDOM.createPortal(
    <Container
      style={{
        position: 'absolute',
        right: 12,
        bottom: 15,
        height: 48,
        width: shrinkTools ? 48 : ASIDE_WIDTH,
        transition: 'width 0.2s ease-in-out',
        borderRadius: 16,
        padding: 8,
        fontSize: 16,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        transformOrigin: 'right bottom',
        transform: isMobile ? 'scale(0.7)' : 'scale(1)',
      }}
    >
      {meuns.map((item, idx) => {
        const key = `${item.key}+${idx}`;
        if (item.type === 'divider') {
          return <Divider key={key} style={{ height: '60%' }} type="vertical" />;
        }
        return (
          <ToolItem onClick={item.onClick} key={key}>
            {item.icon}
          </ToolItem>
        );
      })}
    </Container>,
    document.body
  );
};

export default React.memo(Flexible);
