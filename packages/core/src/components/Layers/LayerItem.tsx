import Icon from '@ant-design/icons';
import { Flex } from 'antd';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import { IconEyeClose, IconEyeOpen, IconMore } from '../../icons';
import useLayerStore from '../../store/useLayer';
import { Layers } from '../../types/Layers';
import Container from '../Container';
import { ToolItem } from '../index';
import PreviewCanvas from './components/PreviewCanvas';

const Wrapper = styled(Container)<{ $active?: boolean }>`
  width: 100%;
  display: grid;
  grid-template-columns: 32px 62px minmax(0px, 1fr) 32px;
  padding: 8px 4px;
  -webkit-box-align: center;
  align-items: center;
  gap: 6px;
  user-select: none;
  min-height: 64px;
  border: 1px solid var(--container-border-color);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  background-color: ${({ $active }) =>
    $active ? 'var(--color-primary-bg) !important' : 'transparent'};
  box-shadow: none !important;
  &:hover {
    border-color: var(--color-primary-active);
  }
`;

interface LayerItemProps extends Layers {}

const LayerItem: React.FC<LayerItemProps> = (props) => {
  const { visible, order, name, opacity, id } = props;

  const { drawingLayer, setDrawingLayer, pushHistory, layers } = useLayerStore(
    useShallow((state) => ({
      drawingLayer: state.drawingLayer,
      setDrawingLayer: state.setDrawingLayer,
      pushHistory: state.pushHistory,
      layers: state.layers,
    }))
  );

  const isActive = useMemo(() => {
    return drawingLayer?.id === props.id;
  }, [drawingLayer?.id, props.id]);

  const handlerSetLayer = (key: keyof Layers, value: any) => {
    const newLayers = layers.map((layer) => {
      if (layer.id === id) {
        return { ...layer, [key]: value };
      }
      return layer;
    });
    pushHistory(newLayers);
  };

  return (
    <Wrapper onClick={() => setDrawingLayer(props)} $active={isActive}>
      <Flex align="center" justify="center">
        <ToolItem
          onClick={(e) => {
            e.stopPropagation();
            handlerSetLayer('visible', !visible);
          }}
          style={{ aspectRatio: 1, fontSize: 16 }}
          $active={false}
        >
          <Icon component={visible ? IconEyeOpen : IconEyeClose} />
        </ToolItem>
      </Flex>

      <Flex
        style={{
          aspectRatio: 16 / 9,
          backgroundColor: 'var(--color-fill-tertiary)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
        align="center"
        justify="center"
      >
        <PreviewCanvas {...props} />
      </Flex>
      <Flex
        style={{
          borderRadius: 4,
          fontSize: 13,
        }}
        vertical
        justify="space-around"
      >
        <span>{name || `${order + 1}`}</span>
        <span>{opacity}%</span>
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
