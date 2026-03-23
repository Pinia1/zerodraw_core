import Icon from '@ant-design/icons';
import { useMemoizedFn, useThrottleFn } from '@zeroDraw/common';
import { Flex, Input, Popover, Select, Slider } from 'antd';
import Konva from 'konva';
import React, { isValidElement, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useShallow } from 'zustand/react/shallow';
import useBindRef from '../../hooks/useBindRef';
import useLayerToBitmap from '../../hooks/useLayerToBitmap';
import { IconEyeClose, IconEyeOpen, IconMore } from '../../icons';
import useLayerStore from '../../store/useLayer';
import useToolsStore from '../../store/useTools';
import { Actions } from '../../types/Drawing';
import type { LayerFilter, Layers } from '../../types/Layers';
import { FILTER_PRESETS } from '../../utils/Filter';
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

const StopPointerWrapper = ({ children }: { children: React.ReactNode }) => {
  if (isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      onPointerDown: (e: React.PointerEvent) => {
        e.stopPropagation();
        children.props.onPointerDown?.(e);
      },
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        children.props.onClick?.(e);
      },
    });
  }
  return children;
};

interface LayerItemProps extends Layers {}

const LayerItem: React.FC<LayerItemProps> = (props) => {
  const { visible, name, opacity, id, blendMode, filter } = props;

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

  const normalizedFilter: Required<LayerFilter> = useMemo(() => {
    return {
      blur: 0,
      brightness: 100,
      contrast: 100,
      saturate: 100,
      hueRotate: 0,
      sepia: 0,
      grayscale: 0,
      invert: 0,
      ...(filter ?? {}),
    };
  }, [filter]);

  const selectedPresetKey = useMemo(() => {
    const hit = FILTER_PRESETS.find((p) => {
      const v = p.value;
      return (
        v.blur === normalizedFilter.blur &&
        v.brightness === normalizedFilter.brightness &&
        v.contrast === normalizedFilter.contrast &&
        v.saturate === normalizedFilter.saturate &&
        v.hueRotate === normalizedFilter.hueRotate &&
        v.sepia === normalizedFilter.sepia &&
        v.grayscale === normalizedFilter.grayscale &&
        v.invert === normalizedFilter.invert
      );
    });
    return hit?.key ?? 'custom';
  }, [normalizedFilter]);

  const updateFilter = useMemoizedFn((patch: Partial<LayerFilter>, push?: boolean) => {
    handlerSetLayer('filter', { ...normalizedFilter, ...patch }, push);
  });

  return (
    <Wrapper onClick={handleBindLayer} $active={isActive}>
      <Flex align="center" justify="center">
        <StopPointerWrapper>
          <ToolItem
            onClick={() => {
              handlerSetLayer('visible', !visible, true);
            }}
            style={{ aspectRatio: 1, fontSize: 16 }}
            $active={false}
          >
            <Icon component={visible ? IconEyeOpen : IconEyeClose} />
          </ToolItem>
        </StopPointerWrapper>
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
        <StopPointerWrapper>
          <StyledInput
            onChange={(e) => handlerSetLayer('name', e.target.value, false)}
            onBlur={(e) => {
              if (nameRef.current === e.target.value) return;
              handlerSetLayer('name', e.target.value, true);
            }}
            onFocus={() => (nameRef.current = name)}
            size="small"
            value={name}
          />
        </StopPointerWrapper>
        <Popover
          placement="bottom"
          trigger="click"
          styles={{
            container: { padding: '3px 10px' },
          }}
          destroyOnHidden
          onOpenChange={onOpenChange}
          content={
            <StopPointerWrapper>
              <Flex
                style={{
                  padding: '4px 0px',
                }}
                vertical
              >
                <span style={{ marginBottom: -6 }}>Opacity: </span>
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
                <span style={{ marginBottom: 2 }}>Blend mode: </span>
                <Select
                  onChange={(value) => {
                    handlerSetLayer('blendMode', value, true);
                  }}
                  value={blendMode}
                  options={[
                    {
                      label: 'Normal',
                      value: 'normal',
                    },
                    {
                      label: 'Multiply',
                      value: 'multiply',
                    },
                    {
                      label: 'Screen',
                      value: 'screen',
                    },
                    {
                      label: 'Overlay',
                      value: 'overlay',
                    },
                    {
                      label: 'Color Dodge',
                      value: 'color-dodge',
                    },
                  ]}
                />

                <span style={{ marginBottom: 2, marginTop: 8 }}>Filter preset: </span>
                <Select
                  value={selectedPresetKey}
                  options={[
                    ...FILTER_PRESETS.map((p) => ({ label: p.label, value: p.key })),
                    { label: 'Custom', value: 'custom' },
                  ]}
                  onChange={(key) => {
                    const preset = FILTER_PRESETS.find((p) => p.key === key);
                    if (!preset) return;
                    handlerSetLayer('filter', preset.value, true);
                  }}
                />

                <span style={{ marginBottom: -6, marginTop: 6 }}>Blur: </span>
                <Slider
                  style={{ width: '120px' }}
                  min={0}
                  max={50}
                  step={1}
                  value={normalizedFilter.blur}
                  onChange={(value) => updateFilter({ blur: value as number }, false)}
                  onAfterChange={(value) => updateFilter({ blur: value as number }, true)}
                />

                <span style={{ marginBottom: -6 }}>Brightness: </span>
                <Slider
                  style={{ width: '120px' }}
                  min={0}
                  max={200}
                  step={1}
                  value={normalizedFilter.brightness}
                  onChange={(value) => updateFilter({ brightness: value as number }, false)}
                  onAfterChange={(value) => updateFilter({ brightness: value as number }, true)}
                />

                <span style={{ marginBottom: -6 }}>Contrast: </span>
                <Slider
                  style={{ width: '120px' }}
                  min={0}
                  max={200}
                  step={1}
                  value={normalizedFilter.contrast}
                  onChange={(value) => updateFilter({ contrast: value as number }, false)}
                  onAfterChange={(value) => updateFilter({ contrast: value as number }, true)}
                />

                <span style={{ marginBottom: -6 }}>Saturate: </span>
                <Slider
                  style={{ width: '120px' }}
                  min={0}
                  max={200}
                  step={1}
                  value={normalizedFilter.saturate}
                  onChange={(value) => updateFilter({ saturate: value as number }, false)}
                  onAfterChange={(value) => updateFilter({ saturate: value as number }, true)}
                />

                <span style={{ marginBottom: -6 }}>Hue rotate: </span>
                <Slider
                  style={{ width: '120px' }}
                  min={-180}
                  max={180}
                  step={1}
                  value={normalizedFilter.hueRotate}
                  onChange={(value) => updateFilter({ hueRotate: value as number }, false)}
                  onAfterChange={(value) => updateFilter({ hueRotate: value as number }, true)}
                />
              </Flex>
            </StopPointerWrapper>
          }
        >
          <span onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer' }}>
            {blendMode[0].toUpperCase()} {opacity}%
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
