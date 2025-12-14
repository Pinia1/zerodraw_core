import Icon, { ClearOutlined } from '@ant-design/icons';
import { Divider } from 'antd';
import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { IconLassoAdd, IconLassoCopy, IconLassoInvert, IconLassoRemove } from '../../../icons';
import { useDrawingStore } from '../../../store/useDrawing';
import useLayerStore from '../../../store/useLayer';
import { LassoConfigTypes, LassoMode } from '../../../types/Drawing';
import Container from '../../Container';
import { ToolItem } from '../../index';
import { ContainerStyle, ToolItemStyle } from './PenConf';

const LassoConf = () => {
  const { lassoConfig, setLassoConfig } = useDrawingStore(
    useShallow((state) => ({
      lassoConfig: state.lassoConfig,
      setLassoConfig: state.setLassoConfig,
    }))
  );

  const { lassos } = useLayerStore(
    useShallow((state) => ({
      lassos: state.drawingLayer?.lassos,
    }))
  );

  const handleSetLassoConfig = (key: keyof LassoConfigTypes, value: LassoMode) => {
    setLassoConfig({ ...lassoConfig, [key]: value });
  };

  const menus = useMemo(() => {
    return [
      {
        key: LassoMode.ADD,
        icon: <Icon component={IconLassoAdd} />,
        onClick: () => handleSetLassoConfig('type', LassoMode.ADD),
        get isActive(): boolean {
          return lassoConfig.type === LassoMode.ADD;
        },
      },
      {
        key: LassoMode.REMOVE,
        icon: <Icon component={IconLassoRemove} />,
        onClick: () => handleSetLassoConfig('type', LassoMode.REMOVE),
        get isActive(): boolean {
          return lassoConfig.type === LassoMode.REMOVE;
        },
        get disabled(): boolean {
          return lassos?.length === 0;
        },
      },
      {
        key: 'copy',
        icon: <Icon component={IconLassoCopy} />,
        onClick: () => {},
        get isActive(): boolean {
          return false;
        },
      },
      {
        key: 'invert',
        icon: <Icon component={IconLassoInvert} />,
        onClick: () => {},
        get isActive(): boolean {
          return false;
        },
      },
    ];
  }, [lassoConfig.type, lassos?.length]);

  return (
    <Container style={ContainerStyle}>
      {menus.map((item) => {
        return (
          <ToolItem
            key={item.key}
            onClick={item.onClick}
            style={ToolItemStyle}
            $active={item.isActive}
            $disabled={item.disabled}
          >
            {item.icon}
          </ToolItem>
        );
      })}

      <Divider style={{ fontSize: 18 }} type="vertical" />
      <ToolItem style={ToolItemStyle} $active={false}>
        <Icon component={ClearOutlined as any} />
      </ToolItem>
    </Container>
  );
};

export default React.memo(LassoConf);
