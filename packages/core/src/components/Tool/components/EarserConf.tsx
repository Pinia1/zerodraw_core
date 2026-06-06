import Icon from '@ant-design/icons';
import { Divider, Input, Slider, Tooltip } from 'antd';
import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { IconConf, IconEraser, IconRemove } from '@core/icons';
import { useDrawingStore } from '../../../store/useDrawing';
import useToolsStore from '../../../store/useTools';
import { Actions, LineConfigTypes } from '../../../types/Drawing';
import Container from '../../Container';
import { ToolItem } from '../../index';
import { ActionFlex, ContainerStyle, ToolItemStyle } from './PenConf';

const EarserConf = () => {
  const { activeKey, setActiveKey } = useToolsStore(
    useShallow((state) => ({
      activeKey: state.activeKey,
      setActiveKey: state.setActiveKey,
    }))
  );
  const { eraserConfig, brushDetailConfPosition, setBrushDetailConfPosition, setEraserConfig } =
    useDrawingStore(
      useShallow((state) => ({
        brushDetailConfPosition: state.brushDetailConfPosition,
        setBrushDetailConfPosition: state.setBrushDetailConfPosition,
        setEraserConfig: state.setEraserConfig,
        eraserConfig: state.eraserConfig,
      }))
    );

  const handleSetLineConfig = (key: keyof LineConfigTypes, value: number) => {
    setEraserConfig({ ...eraserConfig, [key]: value });
  };

  return (
    <Container style={ContainerStyle}>
      <ToolItem
        onClick={() => setActiveKey(Actions.ERASER)}
        style={ToolItemStyle}
        $active={activeKey === Actions.ERASER}
      >
        <Tooltip title="Pixel erasure">
          <Icon component={IconEraser} />
        </Tooltip>
      </ToolItem>
      <ToolItem
        onClick={() => setActiveKey(Actions.REMOVE)}
        style={ToolItemStyle}
        $active={activeKey === Actions.REMOVE}
      >
        <Tooltip title="Object erasure">
          <Icon component={IconRemove} />
        </Tooltip>
      </ToolItem>
      <Divider style={{ fontSize: 18 }} type="vertical" />
      <ActionFlex>
        <span>Size</span>
        <Slider
          tooltip={{ open: false }}
          min={1}
          max={100}
          onChange={(value) => handleSetLineConfig('strokeWidth', value)}
          defaultValue={eraserConfig.strokeWidth}
        />
        <Input
          style={{ width: 55, height: 24 }}
          onChange={(e) => handleSetLineConfig('strokeWidth', Number(e.target.value))}
          value={eraserConfig.strokeWidth}
          max={100}
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
          value={eraserConfig.opacity * 100}
        />
        <Input
          style={{ width: 55, height: 24 }}
          onChange={(e) => handleSetLineConfig('opacity', Number(e.target.value) / 100)}
          value={Math.round(eraserConfig.opacity * 100)}
          max={100}
          min={0}
          step={1}
          suffix="%"
        />
      </ActionFlex>
      <Divider style={{ fontSize: 18 }} type="vertical" />
      <ToolItem
        style={ToolItemStyle}
        $active={brushDetailConfPosition.visible}
        onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
        onClick={(e: React.MouseEvent) => {
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          setBrushDetailConfPosition({
            visible: !brushDetailConfPosition.visible,
            position: brushDetailConfPosition.visible
              ? { x: 0, y: 0 }
              : { x: rect.x + rect.width / 2, y: rect.y + rect.height },
          });
        }}
      >
        <Icon component={IconConf} />
      </ToolItem>
    </Container>
  );
};

export default React.memo(EarserConf);
