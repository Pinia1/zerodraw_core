import Icon, { ClearOutlined } from '@ant-design/icons';
import { useMemoizedFn } from '@monorepo/common';
import { Divider } from 'antd';
import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { IconLassoAdd, IconLassoCopy, IconLassoInvert, IconLassoRemove } from '../../../icons';
import { useDrawingStore } from '../../../store/useDrawing';
import useLayerStore from '../../../store/useLayer';
import { LassoConfigTypes, LassoMode } from '../../../types/Drawing';
import type { Lasso, Layers } from '../../../types/Layers';
import { generateUUID } from '../../../utils/drawing';
import { invertLassos } from '../../../utils/Lasso';
import Container from '../../Container';
import { ToolItem } from '../../index';
import { ContainerStyle, ToolItemStyle } from './PenConf';

const LassoConf = () => {
  const { lassoConfig, setLassoConfig, layerConfig, stageConfig, fillColor } = useDrawingStore(
    useShallow((state) => ({
      lassoConfig: state.lassoConfig,
      setLassoConfig: state.setLassoConfig,
      layerConfig: state.layerConfig,
      stageConfig: state.stageConfig,
      fillColor: state.fillColor,
    }))
  );

  const { drawingLayer, setDrawingLayer, layers, pushHistory } = useLayerStore(
    useShallow((state) => ({
      drawingLayer: state.drawingLayer,
      setDrawingLayer: state.setDrawingLayer,
      layers: state.layers,
      pushHistory: state.pushHistory,
    }))
  );

  const handleSetLassoConfig = (key: keyof LassoConfigTypes, value: LassoMode) => {
    setLassoConfig({ ...lassoConfig, [key]: value });
  };

  const commitDrawingLayer = useMemoizedFn((next: Layers) => {
    setDrawingLayer(next);
    const idx = layers.findIndex((l) => l.id === next.id);
    if (idx === -1) return;
    const newLayers = [...layers];
    newLayers[idx] = next;
    pushHistory(newLayers);
  });

  const handleClearLasso = useMemoizedFn(() => {
    if (!drawingLayer) return;
    if (!drawingLayer.lassos?.length) return;

    commitDrawingLayer({
      ...(drawingLayer as Layers),
      lassos: [],
      diagrams: drawingLayer.diagrams.filter((d) => d.type !== 'lasso'),
    });
  });

  const handleInvertLasso = useMemoizedFn(() => {
    if (!drawingLayer) return;
    // 反选时把边界往里收，保证左/上边缘蚂蚁线可见。
    const inset = 2;
    const safeWidth = Math.max(0, layerConfig.width - inset * 2);
    const safeHeight = Math.max(0, layerConfig.height - inset * 2);

    const invertedPoints = invertLassos(
      (drawingLayer.lassos ?? []).map((l) => ({ points: l.points })),
      { x: inset, y: inset, width: safeWidth, height: safeHeight }
    );

    const newLassos: Lasso[] =
      invertedPoints.length >= 4
        ? [
            {
              id: generateUUID(),
              points: invertedPoints,
              stroke: fillColor,
              scale: stageConfig.scale,
              mode: LassoMode.ADD,
            },
          ]
        : [];

    const newDiagrams = drawingLayer.diagrams.filter((d) => d.type !== 'lasso');
    if (newLassos.length) {
      newDiagrams.push({ id: newLassos[0].id, type: 'lasso' });
    }

    commitDrawingLayer({
      ...(drawingLayer as Layers),
      lassos: newLassos,
      diagrams: newDiagrams,
    });
  });

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
          return drawingLayer?.lassos?.length === 0;
        },
      },
      {
        key: 'invert',
        icon: <Icon component={IconLassoInvert} />,
        onClick: handleInvertLasso,
        get isActive(): boolean {
          return false;
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
    ];
  }, [lassoConfig.type, drawingLayer?.lassos?.length]);

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
      <ToolItem onClick={handleClearLasso} style={ToolItemStyle} $active={false}>
        <Icon component={ClearOutlined as any} />
      </ToolItem>
    </Container>
  );
};

export default React.memo(LassoConf);
