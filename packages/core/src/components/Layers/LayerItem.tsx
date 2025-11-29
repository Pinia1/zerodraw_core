import Icon from '@ant-design/icons';
import { Flex } from 'antd';
import React from 'react';
import styled from 'styled-components';
import { IconEyeClose, IconEyeOpen, IconMore } from '../../icons';
import { Layers } from '../../types/Layers';
import { ToolItem } from '../index';

const Wrapper = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: 32px 62px minmax(0px, 1fr) 32px;
  padding: 8px 4px;
  -webkit-box-align: center;
  align-items: center;
  gap: 4px;
  user-select: none;
  min-height: 64px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: rgb(36, 36, 37);
  font-size: 14px;
`;

interface LayerItemProps extends Layers {}

const LayerItem: React.FC<LayerItemProps> = ({ visible }) => {
  return (
    <Wrapper>
      <Flex align="center" justify="center">
        <ToolItem style={{ aspectRatio: 1, fontSize: 16 }} $active={false}>
          <Icon component={visible ? IconEyeOpen : IconEyeClose} />
        </ToolItem>
      </Flex>

      <Flex
        style={{
          aspectRatio: 16 / 9,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 4,
        }}
        align="center"
        justify="center"
      >
        2
      </Flex>
      <Flex
        style={{
          borderRadius: 4,
        }}
        vertical
        justify="space-around"
      >
        <span>3</span>
        <span>4</span>
      </Flex>
      <Flex align="center" justify="center">
        <ToolItem style={{ aspectRatio: 1 }} $active={false}>
          <Icon component={IconMore} />
        </ToolItem>
      </Flex>
    </Wrapper>
  );
};

export default React.memo(LayerItem);
