import Icon from '@ant-design/icons';
import { Divider, Input, Slider } from 'antd';
import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { IconConf, IconElli, IconLine, IconRect } from '../../../icons';
import { useDrawingStore } from '../../../store/useDrawing';
import useToolsStore from '../../../store/useTools';
import { Actions, GraphConfigTypes } from '../../../types/Drawing';
import Container from '../../Container';
import { ToolItem } from '../../index';
import { ActionFlex, ContainerStyle, ToolItemStyle } from './PenConf';

const RectConf = () => {
  const { activeKey, setActiveKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
      setActiveKey: state.setActiveKey,
    }))
  );
  const { graphConfig, setGraphConfig } = useDrawingStore(
    useShallow((state) => ({
      graphConfig: state.graphConfig,
      setGraphConfig: state.setGraphConfig,
    }))
  );

  const handleSetGraphConfig = (key: keyof GraphConfigTypes, value: number) => {
    setGraphConfig({ ...graphConfig, [key]: value });
  };

  const menus = useMemo(() => {
    return [
      {
        key: Actions.RECT,
        icon: <Icon component={IconRect} />,
        onClick: () => setActiveKey(Actions.RECT),
        get isActive(): boolean {
          return activeKey === Actions.RECT;
        },
      },
      {
        key: Actions.ELLIPSE,
        icon: <Icon component={IconElli} />,
        onClick: () => setActiveKey(Actions.ELLIPSE),
        get isActive(): boolean {
          return activeKey === Actions.ELLIPSE;
        },
      },
      {
        key: Actions.LINE,
        icon: <Icon component={IconLine} />,
        onClick: () => setActiveKey(Actions.LINE),
        get isActive(): boolean {
          return activeKey === Actions.LINE;
        },
      },
    ];
  }, [activeKey]);

  return (
    <Container style={ContainerStyle}>
      {menus.map((item) => {
        return (
          <ToolItem
            key={item.key}
            onClick={item.onClick}
            style={ToolItemStyle}
            $active={item.isActive}
          >
            {item.icon}
          </ToolItem>
        );
      })}

      <Divider style={{ fontSize: 18 }} type="vertical" />
      <ActionFlex>
        <span>Thickness</span>
        <Slider
          tooltip={{ open: false }}
          min={1}
          max={250}
          onChange={(value) => handleSetGraphConfig('strokeWidth', value)}
          defaultValue={graphConfig.strokeWidth}
        />
        <Input
          style={{ width: 55, height: 24 }}
          onChange={(e) => handleSetGraphConfig('strokeWidth', Number(e.target.value))}
          value={graphConfig.strokeWidth}
          max={250}
          min={1}
          suffix="px"
        />
      </ActionFlex>
      <ActionFlex>
        <span>Opacity</span>
        <Slider
          tooltip={{ open: false }}
          min={0}
          max={100}
          step={1}
          onChange={(value) => handleSetGraphConfig('opacity', value / 100)}
          value={graphConfig.opacity * 100}
        />
        <Input
          style={{ width: 55, height: 24 }}
          onChange={(e) => handleSetGraphConfig('opacity', Number(e.target.value) / 100)}
          value={Math.round(graphConfig.opacity * 100)}
          max={100}
          min={0}
          step={1}
          suffix="%"
        />
      </ActionFlex>
      <Divider style={{ fontSize: 18 }} type="vertical" />
      <ToolItem style={ToolItemStyle} $active={false}>
        <Icon component={IconConf} />
      </ToolItem>
    </Container>
  );
};

export default React.memo(RectConf);
