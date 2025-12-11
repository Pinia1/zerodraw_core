import Icon from '@ant-design/icons';
import { useMemoizedFn, useThrottleFn } from '@monorepo/common';
import { Flex, Input, Popover, Slider } from 'antd';
import Konva from 'konva';
import React, { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import useBindRef from '../../hooks/useBindRef';
import useLayerToBitmap from '../../hooks/useLayerToBitmap';
import { IconEyeClose, IconEyeOpen, IconMore } from '../../icons';
import useLayerStore from '../../store/useLayer';
import useToolsStore from '../../store/useTools';
import { Actions } from '../../types/Drawing';
import { Layers } from '../../types/Layers';
import Container from '../Container';
import { ToolItem } from '../index';
import Menus from './components/Menus';
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

const StyledInput = styled(Input)`
  border: none;
  box-shadow: none;
  background-color: transparent;
  padding-left: 2px;
  user-select: text;

  &:focus {
    box-shadow: none;
  }
`;

interface LayerItemProps extends Layers {}

const LayerItem: React.FC<LayerItemProps> = (props) => {
  const { visible, name, opacity, id } = props;

  const stageRef = useBindRef();
  const opacityRef = useRef(opacity);
  const nameRef = useRef(name);

  const [menuOpen, setMenuOpen] = useState(false);

  const { run: runBitmap } = useLayerToBitmap();

  const { activeKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
    }))
  );

  const { drawingLayer, setDrawingLayer, pushHistory, layers, setLayers } = useLayerStore(
    useShallow((state) => ({
      drawingLayer: state.drawingLayer,
      setDrawingLayer: state.setDrawingLayer,
      pushHistory: state.pushHistory,
      layers: state.layers,
      setLayers: state.setLayers,
    }))
  );

  const isActive = useMemo(() => {
    return drawingLayer?.id === props.id;
  }, [drawingLayer?.id, props.id]);

  const { run: handlerSetLayer } = useThrottleFn(
    (key: keyof Layers, value: any, push?: boolean) => {
      const newLayers = layers.map((layer) => {
        if (layer.id === id) {
          return { ...layer, [key]: value };
        }
        return layer;
      });
      if (drawingLayer?.id === id) {
        setDrawingLayer({ ...drawingLayer, [key]: value });
      }
      if (push) {
        pushHistory(newLayers);
      } else {
        setLayers(newLayers);
      }
    },
    { wait: 16 }
  );
  const handleBindLayer = async () => {
    const newLayers = [...layers];
    const index = newLayers.findIndex((item) => item.id === props.id);

    if (index === newLayers.length - 1) return;

    if (activeKey !== Actions.ROPE) {
      setDrawingLayer(props);
      newLayers.splice(index, 1);
      setLayers([...newLayers, props]);
      return;
    }

    const targetLayer = stageRef?.current?.getLayers().find((layer) => layer.attrs.id === props.id);
    const group = targetLayer?.findOne('Group');

    const newLayer = (await runBitmap(props, group as Konva.Group)) as Layers;

    if (newLayer) {
      setDrawingLayer(newLayer);
      newLayers.splice(index, 1);
      setLayers([...newLayers, newLayer]);
    }
  };

  const onOpenChange = useMemoizedFn((visible: boolean) => {
    if (!visible && opacityRef.current !== opacity) {
      handlerSetLayer('opacity', opacity, true);
    } else {
      opacityRef.current = opacity;
    }
  });

  return (
    <Wrapper onClick={handleBindLayer} $active={isActive}>
      <Flex align="center" justify="center">
        <ToolItem
          onClick={(e) => {
            e.stopPropagation();
            handlerSetLayer('visible', !visible, true);
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
        <StyledInput
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => handlerSetLayer('name', e.target.value, false)}
          onBlur={(e) => {
            if (nameRef.current === e.target.value) return;
            handlerSetLayer('name', e.target.value, true);
          }}
          onFocus={() => (nameRef.current = name)}
          size="small"
          value={name}
        />
        <Popover
          placement="bottom"
          trigger="click"
          styles={{
            body: { padding: '3px 10px' },
          }}
          destroyOnHidden
          onOpenChange={onOpenChange}
          content={
            <Flex vertical onPointerDown={(e) => e.stopPropagation()}>
              <span style={{ marginBottom: -6, marginTop: 4 }}>Opacity: </span>
              <Slider
                style={{
                  width: '120px',
                }}
                min={0}
                max={100}
                step={1}
                value={opacity}
                onChange={(value) => {
                  handlerSetLayer('opacity', value, false);
                }}
              />
            </Flex>
          }
        >
          <span onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer' }}>
            {opacity}%
          </span>
        </Popover>
      </Flex>
      <Flex align="center" justify="center">
        <Popover
          destroyOnHidden
          trigger="click"
          placement="right"
          content={<Menus {...props} setMenuOpen={setMenuOpen} />}
          open={menuOpen}
          onOpenChange={setMenuOpen}
        >
          <ToolItem style={{ aspectRatio: 1 }} $active={false}>
            <Icon component={IconMore} />
          </ToolItem>
        </Popover>
      </Flex>
    </Wrapper>
  );
};

export default React.memo(LayerItem);
