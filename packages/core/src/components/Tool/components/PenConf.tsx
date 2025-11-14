import Icon from '@ant-design/icons';
import { Divider, Flex, Input, Slider } from 'antd';
import React from 'react';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import { ToolItem } from '..';
import { IconConf, IconFill, IconPen } from '../../../icons';
import { useDrawingStore } from '../../../store/useDrawing';
import useToolsStore from '../../../store/useTools';
import { Actions, LineConfigTypes } from '../../../types/Drawing';
import Container from '../../Container';

export const ToolItemStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
};

export const ContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  fontSize: 16,
  alignItems: 'center',
};

export const ActionFlex = styled(Flex)`
  font-size: 12px;
  line-height: 12px;
  align-items: center;
  justify-content: center;

  & > .ant-slider {
    width: 82px;
    margin: 0px 10px;
  }
`;

const PenConf = () => {
  const { activeKey, setActiveKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
      setActiveKey: state.setActiveKey,
    }))
  );
  const { lineConfig, setLineConfig } = useDrawingStore(
    useShallow((state) => ({
      lineConfig: state.lineConfig,
      setLineConfig: state.setLineConfig,
    }))
  );

  const handleSetLineConfig = (key: keyof LineConfigTypes, value: number) => {
    setLineConfig({ ...lineConfig, [key]: value });
  };

  return (
    <Container style={ContainerStyle}>
      <ToolItem
        onClick={() => setActiveKey(Actions.PEN)}
        style={ToolItemStyle}
        $active={activeKey === Actions.PEN}
      >
        <Icon component={IconPen} />
      </ToolItem>
      <ToolItem
        onClick={() => setActiveKey(Actions.FILL)}
        style={ToolItemStyle}
        $active={activeKey === Actions.FILL}
      >
        <Icon component={IconFill} />
      </ToolItem>
      <Divider style={{ fontSize: 18 }} type="vertical" />
      <ActionFlex>
        <span>Size</span>
        <Slider
          tooltip={{ open: false }}
          min={1}
          max={250}
          onChange={(value) => handleSetLineConfig('strokeWidth', value)}
          defaultValue={lineConfig.strokeWidth}
        />
        <Input
          style={{ width: 55, height: 24 }}
          onChange={(e) => handleSetLineConfig('strokeWidth', Number(e.target.value))}
          value={lineConfig.strokeWidth}
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
          onChange={(value) => handleSetLineConfig('opacity', value / 100)}
          value={lineConfig.opacity * 100}
        />
        <Input
          style={{ width: 55, height: 24 }}
          onChange={(e) => handleSetLineConfig('opacity', Number(e.target.value) / 100)}
          value={Math.round(lineConfig.opacity * 100)}
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

export default React.memo(PenConf);
