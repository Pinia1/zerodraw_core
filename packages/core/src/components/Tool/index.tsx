import Icon, { LoadingOutlined } from '@ant-design/icons';
import { Divider, Popover } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useUpload from '../../hooks/useUpload';
import {
  IconAdd,
  IconColor,
  IconEraser,
  IconLasso,
  IconPen,
  IconPoint,
  IconRect,
  IconRedo,
  IconUndo,
} from '../../icons';
import { useDrawingStore } from '../../store/useDrawing';
import useLayerStore, { initialDrawingLayer } from '../../store/useLayer';
import useToolsStore from '../../store/useTools';
import { Actions, ToolTypes } from '../../types/Drawing';
import type { Fill, Layers } from '../../types/Layers';
import Container from '../Container';
import { ToolItem } from '../index';
import BrushDetail from './components/BrushDetail';
import EarserConf from './components/EarserConf';
import LassoConf from './components/LassoConf';
import PenConf from './components/PenConf';
import Portal from './components/Portal';
import RectConf from './components/RectConf';

const Tool: React.FC = () => {
  const [open, setOpen] = useState(true);

  const { layerConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
    }))
  );

  const { canUndo, canRedo, undoHistory, redoHistory, layers, setDrawingLayer, pushHistory } =
    useLayerStore(
      useShallow((state) => ({
        canUndo: state.canUndo,
        canRedo: state.canRedo,
        undoHistory: state.undoHistory,
        redoHistory: state.redoHistory,
        layers: state.layers,
        setDrawingLayer: state.setDrawingLayer,
        pushHistory: state.pushHistory,
      }))
    );

  const { loading, run } = useUpload({
    accept: 'image/*',
    multiple: false,
    onSuccess: ({ id, url }) => {
      if (!layerConfig.width || !layerConfig.height) return;

      const img = new Image();
      img.src = url;
      img.onload = () => {
        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;

        if (!imgWidth || !imgHeight) return;

        const canvasWidth = layerConfig.width;
        const canvasHeight = layerConfig.height;

        const imageRatio = imgWidth / imgHeight;
        const canvasRatio = canvasWidth / canvasHeight;

        let scale = 1;
        if (imageRatio > canvasRatio) {
          scale = canvasWidth / imgWidth;
        } else {
          scale = canvasHeight / imgHeight;
        }

        const targetWidth = imgWidth * scale;
        const targetHeight = imgHeight * scale;

        // 以画布中心为基准居中
        const x = (canvasWidth - targetWidth) / 2;
        const y = (canvasHeight - targetHeight) / 2;

        const image: Fill = {
          id,
          x,
          y,
          width: targetWidth,
          height: targetHeight,
          img,
          src: url,
        };

        const newLayer: Layers = {
          ...initialDrawingLayer(),
          name: `Layer ${layers.length + 1}`,
          diagrams: [{ id: image.id, type: 'image' }],
          image,
        };

        const newLayers = [...layers, newLayer];

        setDrawingLayer(newLayer);
        pushHistory(newLayers);
      };
    },
  });

  const { activeKey, setActiveKey } = useToolsStore(
    useShallow((state) => {
      return {
        activeKey: state.activeKey,
        setActiveKey: state.setActiveKey,
      };
    })
  );

  const { brushDetailConfPosition, setBrushDetailConfPosition, bindWorkerRef, workerRef } =
    useDrawingStore(
      useShallow((state) => ({
        brushDetailConfPosition: state.brushDetailConfPosition,
        setBrushDetailConfPosition: state.setBrushDetailConfPosition,
        bindWorkerRef: state.bindWorkerRef,
        workerRef: state.workerRef,
      }))
    );

  const toolMenus: {
    key: Actions;
    icon?: React.ReactNode;
    type: ToolTypes;
    onClick?: (item: (typeof toolMenus)[0]) => Promise<void> | void;
    dropdown?: React.ReactNode;
    isActive?: boolean;
    disabled?: boolean;
    dropdownKeys?: Actions[];
  }[] = useMemo(() => {
    return [
      {
        key: Actions.ADD,
        icon: <Icon component={loading ? (LoadingOutlined as any) : IconAdd} />,
        type: ToolTypes.ACTION,
        onClick: () => {
          if (loading) return;
          run();
        },
      },
      {
        key: Actions.None,
        icon: <Icon component={IconAdd} />,
        type: ToolTypes.DIVIDER,
      },
      {
        key: Actions.ROPE,
        icon: <Icon component={IconPoint} />,
        type: ToolTypes.STATE,
        get isActive() {
          return activeKey === Actions.ROPE;
        },
      },
      {
        key: Actions.PEN,
        icon: <Icon component={IconPen} />,
        type: ToolTypes.STATE,
        dropdown: <PenConf />,
        dropdownKeys: [Actions.PEN, Actions.FILL],
        onClick: () => {},
        get isActive() {
          return [Actions.PEN, Actions.FILL].includes(activeKey);
        },
      },
      {
        key: Actions.ERASER,
        icon: <Icon component={IconEraser} />,
        type: ToolTypes.STATE,
        dropdown: <EarserConf />,
        dropdownKeys: [Actions.ERASER],
        get isActive() {
          return activeKey === Actions.ERASER;
        },
      },
      {
        key: Actions.COLOR,
        icon: <IconColor />,
        type: ToolTypes.ACTION,
        onClick: () => {},
        get isActive() {
          return activeKey === Actions.COLOR;
        },
      },
      {
        key: Actions.RECT,
        icon: <Icon component={IconRect} />,
        type: ToolTypes.STATE,
        dropdown: <RectConf />,
        dropdownKeys: [Actions.RECT, Actions.ELLIPSE, Actions.LINE],
        get isActive() {
          return [Actions.RECT, Actions.ELLIPSE, Actions.LINE].includes(activeKey);
        },
      },

      {
        key: Actions.LASSO,
        icon: <Icon component={IconLasso} />,
        type: ToolTypes.STATE,
        dropdown: <LassoConf />,
        dropdownKeys: [Actions.LASSO],
        get isActive() {
          return activeKey === Actions.LASSO;
        },
      },
      {
        key: Actions.None,
        icon: <Icon component={IconAdd} />,
        type: ToolTypes.DIVIDER,
      },
      {
        key: Actions.None,
        icon: <Icon component={IconUndo} />,
        type: ToolTypes.ACTION,
        onClick: () => {
          undoHistory();
        },
        disabled: !canUndo,
      },
      {
        key: Actions.None,
        icon: <Icon component={IconRedo} />,
        type: ToolTypes.ACTION,
        onClick: () => {
          redoHistory();
        },
        disabled: !canRedo,
      },
    ];
  }, [activeKey, canUndo, canRedo, loading]);

  const handleSetActiveKey = async (item: (typeof toolMenus)[0]) => {
    if (item.disabled) return;

    await item.onClick?.(item);
    if (item.type !== ToolTypes.STATE) return;

    setActiveKey(item.key);
    if (!item.dropdown) return;
    setOpen((prev) => (item.key === activeKey ? !prev : true));
  };

  const PopoverContent = useMemo(() => {
    const item = toolMenus.find((item) => item.dropdownKeys?.includes(activeKey));
    return item?.dropdown;
  }, [activeKey]);

  useEffect(() => {
    if (activeKey !== Actions.FILL && workerRef) {
      workerRef.destroy?.();
      bindWorkerRef(null);
    }
  }, [activeKey]);

  return (
    <Popover
      arrow={false}
      trigger="click"
      content={PopoverContent}
      open={PopoverContent ? open : false}
      styles={{
        body: {
          padding: 4,
        },
      }}
    >
      <Container
        style={{
          position: 'fixed',
          width: 'fit-content',
          top: '1rem',
          left: '0px',
          right: '0px',
          margin: '0 auto',
          zIndex: 10,
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          height: '48px',
          padding: '8px',
          overflow: 'hidden',
          borderRadius: '16px',
        }}
      >
        {toolMenus.map((item, idx) => {
          const key = `${item.key}+${idx}`;
          if (item.type === ToolTypes.DIVIDER) {
            return <Divider key={key} style={{ height: '60%' }} type="vertical" />;
          }
          return (
            <ToolItem
              $disabled={item.disabled}
              onClick={() => handleSetActiveKey(item)}
              $active={!!item.isActive}
              key={key}
            >
              {item.icon}
            </ToolItem>
          );
        })}
        <Portal
          visible={brushDetailConfPosition.visible}
          setVisible={() =>
            setBrushDetailConfPosition({ visible: false, position: { x: 0, y: 0 } })
          }
          position={brushDetailConfPosition.position}
          content={<BrushDetail />}
          popoverStyles={{
            width: 280,
            padding: 0,
          }}
        />
      </Container>
    </Popover>
  );
};

export default React.memo(Tool);
