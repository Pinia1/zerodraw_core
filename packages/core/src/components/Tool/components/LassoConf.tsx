import Icon, { ClearOutlined } from '@ant-design/icons';
import { cropTransparentBorder, useMemoizedFn } from '@zeroDraw/common';
import { Divider, message, Tooltip } from 'antd';
import Konva from 'konva';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { findMissingorder } from '../../../hooks/useCreateLayer';
import useLayerToBitmap from '../../../hooks/useLayerToBitmap';
import {
  IconClip,
  IconElli,
  IconLasso,
  IconLassoAdd,
  IconLassoCopy,
  IconLassoInvert,
  IconLassoRemove,
  IconRect,
} from '@core/icons';
import { useDrawingStore } from '../../../store/useDrawing';
import useLayerStore, { initialDrawingLayer } from '../../../store/useLayer';
import useToolsStore from '../../../store/useTools';
import { Actions, LassoConfigTypes, LassoMode } from '../../../types/Drawing';
import type { Lasso, Layers } from '../../../types/Layers';
import { generateUUID } from '../../../utils/drawing';
import imageManager from '../../../utils/imageManager';
import {
  calcBounds,
  clampBoundsToCanvas,
  clipPathFromPoints,
  invertLassos,
  mergeLassos,
} from '../../../utils/Lasso';
import Container from '../../Container';
import { ToolItem } from '../../index';
import { ContainerStyle, ToolItemStyle } from './PenConf';

const LassoConf = () => {
  const { t } = useTranslation();
  const { lassoConfig, setLassoConfig, layerConfig, stageConfig, fillColor, stageRef } =
    useDrawingStore(
      useShallow((state) => ({
        lassoConfig: state.lassoConfig,
        setLassoConfig: state.setLassoConfig,
        layerConfig: state.layerConfig,
        stageConfig: state.stageConfig,
        fillColor: state.fillColor,
        stageRef: state.stageRef,
      }))
    );

  const { run: runLayerToBitmap } = useLayerToBitmap();

  const { setActiveKey } = useToolsStore(
    useShallow((state) => ({
      setActiveKey: state.setActiveKey,
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

  const getSelectionPoints = useMemoizedFn((): number[] => {
    const l = drawingLayer?.lassos ?? [];
    if (!l.length) return [];
    if (l.length === 1) return l[0].points ?? [];
    return mergeLassos(l.map((i) => ({ points: i.points ?? [], mode: i.mode ?? LassoMode.ADD })));
  });

  const getClipBitmp = async () => {
    if (!drawingLayer) return;
    const lassos = drawingLayer.lassos ?? [];
    if (!lassos.length) return;
    if (!layerConfig.width || !layerConfig.height) return;

    const stage = stageRef?.current;
    const currentKonvaLayer = stage?.getLayers().find((layer) => layer.attrs.isDrawing);
    const group = currentKonvaLayer?.findOne('Group') as Konva.Group | undefined;
    if (!group) return;
    // 1) 计算“最终选区轮廓”：支持多 lasso、ADD/REMOVE、NaN 分段
    const selectionPoints = getSelectionPoints();

    if (!selectionPoints.length) return;

    const rawBounds = calcBounds(selectionPoints);
    const bounds = clampBoundsToCanvas(rawBounds, layerConfig.width, layerConfig.height);
    if (bounds.width <= 0 || bounds.height <= 0) return;

    // 2) 离屏导出：把绘制内容 Group 克隆后套上 clipFunc，仅导出选区内的像素
    const clonedGroup = group.clone({ listening: false });

    const offscreenContainer = document.createElement('div');
    const offscreenStage = new Konva.Stage({
      container: offscreenContainer,
      width: layerConfig.width,
      height: layerConfig.height,
    });
    const offscreenLayer = new Konva.Layer({
      x: 0,
      y: 0,
      clipWidth: layerConfig.width,
      clipHeight: layerConfig.height,
    });
    offscreenStage.add(offscreenLayer);

    const clipGroup = new Konva.Group({
      clipFunc: (ctx) =>
        clipPathFromPoints(ctx as unknown as CanvasRenderingContext2D, selectionPoints),
      clipWidth: layerConfig.width,
      clipHeight: layerConfig.height,
    });
    clipGroup.add(clonedGroup);
    offscreenLayer.add(clipGroup);
    offscreenStage.draw();

    try {
      const targetWidth = 1920;
      let pixelRatio = targetWidth / layerConfig.width;
      pixelRatio = Math.max(1, Math.min(pixelRatio, 3));

      const canvas = clipGroup.toCanvas({
        pixelRatio,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      });
      const ctx2d = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx2d) return;

      const imageData = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
      const { bounds: trimmed } = cropTransparentBorder(imageData);
      if (trimmed.width <= 0 || trimmed.height <= 0) return;

      const blob = (await clipGroup.toBlob({
        pixelRatio,
        mimeType: 'image/webp',
        quality: 1,
        x: bounds.x + trimmed.left / pixelRatio,
        y: bounds.y + trimmed.top / pixelRatio,
        width: trimmed.width / pixelRatio,
        height: trimmed.height / pixelRatio,
      })) as Blob;

      const imageId = generateUUID();

      blob.arrayBuffer().then((buffer) => {
        imageManager.saveImage(imageId, buffer);
      });

      return await new Promise<Layers | null>((resolve) => {
        const img = new window.Image();
        const url = URL.createObjectURL(blob);
        img.src = url;
        img.onload = async () => {
          URL.revokeObjectURL(url);

          const x = bounds.x + trimmed.left / pixelRatio;
          const y = bounds.y + trimmed.top / pixelRatio;
          const width = trimmed.width / pixelRatio;
          const height = trimmed.height / pixelRatio;

          const nextOrder = findMissingorder(layers);
          const newLayerId = generateUUID();
          const layer: Layers = {
            ...initialDrawingLayer(),
            id: newLayerId,
            name: `Layer ${nextOrder + 1}`,
            order: nextOrder,
            diagrams: [{ id: imageId, type: 'image' }],
            image: {
              id: imageId,
              x,
              y,
              width,
              height,
              img,
              src: img.src,
              visible: true,
              maxWidth: Math.min(3000, img.naturalWidth || img.width),
              maxHeight: Math.min(3000, img.naturalHeight || img.height),
            },
          };

          const newLayer = (await runLayerToBitmap(layer, group)) as Layers;

          resolve(newLayer);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
      });
    } finally {
      offscreenStage.destroy();
    }
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

  const handleCopyLasso = useMemoizedFn(async () => {
    const newLayer = (await getClipBitmp()) as Layers;
    if (!newLayer) return;
    setDrawingLayer(newLayer);
    pushHistory([
      ...layers.map((l) =>
        l.id === drawingLayer?.id
          ? {
              ...l,
              diagrams: l.diagrams.filter((d) => d.type !== 'lasso'),
              lassos: [],
            }
          : l
      ),
      newLayer,
    ]);
    setActiveKey(Actions.ROPE);
    message.success(t('lasso.copiedSuccess'));
  });

  const handleClipLasso = useMemoizedFn(async () => {
    const newLayer = (await getClipBitmp()) as Layers;
    if (!newLayer) return;

    const selectionPoints = getSelectionPoints();
    if (!drawingLayer || !selectionPoints.length) return;

    const eraseId = generateUUID();
    const eraseLasso: Lasso = {
      id: eraseId,
      points: selectionPoints,
      stroke: fillColor,
      scale: stageConfig.scale,
      mode: LassoMode.ADD,
    };

    const updatedCurrentLayer: Layers = {
      ...(drawingLayer as Layers),
      lassos: [],
      eraseLassos: [...((drawingLayer as Layers).eraseLassos ?? []), eraseLasso],
      diagrams: [
        ...(drawingLayer as Layers).diagrams.filter((d) => d.type !== 'lasso'),
        { id: eraseId, type: 'eraseLasso' },
      ],
    };

    setDrawingLayer(newLayer);
    pushHistory([
      ...layers.map((l) => (l.id === (drawingLayer as Layers).id ? updatedCurrentLayer : l)),
      newLayer,
    ]);
    setActiveKey(Actions.ROPE);

    message.success(t('lasso.clippedSuccess'));
  });

  const menus = useMemo(() => {
    return [
      {
        key: 'default',
        icon: <Icon component={IconLasso} />,
        onClick: () => setLassoConfig({ ...lassoConfig, shape: 'default' }),
        get isActive(): boolean {
          return lassoConfig.shape === 'default';
        },
        tip: t('lasso.defaultSelection'),
      },
      {
        key: 'rect',
        icon: <Icon component={IconRect} />,
        onClick: () => setLassoConfig({ ...lassoConfig, shape: 'rect' }),
        get isActive(): boolean {
          return lassoConfig.shape === 'rect';
        },
        tip: t('lasso.rectSelection'),
      },
      {
        key: 'ellipse',
        icon: <Icon component={IconElli} />,
        onClick: () => setLassoConfig({ ...lassoConfig, shape: 'ellipse' }),
        get isActive(): boolean {
          return lassoConfig.shape === 'ellipse';
        },
        tip: t('lasso.ellipseSelection'),
      },
      {
        key: 'Divider',
      },
      {
        key: LassoMode.ADD,
        icon: <Icon component={IconLassoAdd} />,
        onClick: () => handleSetLassoConfig('type', LassoMode.ADD),
        get isActive(): boolean {
          return lassoConfig.type === LassoMode.ADD;
        },
        tip: t('lasso.addMode'),
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
        tip: t('lasso.removeMode'),
      },
      {
        key: 'invert',
        icon: <Icon component={IconLassoInvert} />,
        onClick: handleInvertLasso,
        get isActive(): boolean {
          return false;
        },
        tip: t('lasso.invert'),
      },
      {
        key: 'Divider',
      },
      {
        key: 'copy',
        icon: <Icon component={IconLassoCopy} />,
        onClick: handleCopyLasso,
        get isActive(): boolean {
          return false;
        },
        tip: t('lasso.copyToLayer'),
      },
      {
        key: 'clip',
        icon: <Icon component={IconClip} />,
        onClick: handleClipLasso,
        get isActive(): boolean {
          return false;
        },
        tip: t('lasso.clipToLayer'),
      },
      {
        key: 'clear',
        icon: <Icon component={ClearOutlined as any} />,
        onClick: handleClearLasso,
        get isActive(): boolean {
          return false;
        },
        tip: t('lasso.clearSelection'),
      },
    ];
  }, [lassoConfig, drawingLayer?.lassos?.length, t]);

  return (
    <Container style={ContainerStyle}>
      {menus.map((item, index) => {
        if (item.key === 'Divider') {
          return <Divider key={item.key + index} style={{ fontSize: 18 }} type="vertical" />;
        }
        return (
          <Tooltip key={item.key} title={item.tip}>
            <ToolItem
              onClick={item.onClick}
              style={ToolItemStyle}
              $active={item.isActive}
              $disabled={item.disabled}
            >
              {item.icon}
            </ToolItem>
          </Tooltip>
        );
      })}
    </Container>
  );
};

export default React.memo(LassoConf);
