import Icon from '@ant-design/icons';
import { Divider, Flex, Input, Slider } from 'antd';
import React from 'react';
import { ToolItem } from '..';
import { IconConf, IconFill, IconPen } from '../../../icons';
import Container from '../../Container';

const ToolItemStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
};

const ActionConf = () => {
  return (
    <Container
      style={{
        display: 'flex',
        gap: 6,
        fontSize: 16,
        alignItems: 'center',
      }}
    >
      <ToolItem style={ToolItemStyle} $active={false}>
        <Icon component={IconPen} />
      </ToolItem>
      <ToolItem style={ToolItemStyle} $active={false}>
        <Icon component={IconFill} />
      </ToolItem>
      <Divider style={{ fontSize: 18 }} type="vertical" />
      <Flex
        style={{
          fontSize: 12,
          lineHeight: '12px',
        }}
        align="center"
        justify="center"
      >
        <span>Size</span>
        <Slider
          tooltip={{ open: false }}
          min={1}
          max={250}
          style={{ width: 72, margin: '0px 10px' }}
          onChange={() => {}}
          value={10}
        />
        <Input
          style={{ width: 55, height: 24 }}
          onChange={() => {}}
          value={10}
          max={250}
          min={1}
          suffix="px"
        />
      </Flex>
      <Flex
        style={{
          fontSize: 12,
          lineHeight: '12px',
        }}
        align="center"
        justify="center"
      >
        <span>Opacity</span>
        <Slider
          tooltip={{ open: false }}
          min={1}
          max={250}
          style={{ width: 72, margin: '0px 10px' }}
          onChange={() => {}}
          value={10}
        />
        <Input
          style={{ width: 55, height: 24 }}
          onChange={() => {}}
          value={10}
          max={250}
          min={1}
          suffix="px"
        />
      </Flex>
      <Divider style={{ fontSize: 18 }} type="vertical" />
      <ToolItem style={ToolItemStyle} $active={false}>
        <Icon component={IconConf} />
      </ToolItem>
    </Container>
  );
};

export default React.memo(ActionConf);
