import { useDebounceEffect } from '@monorepo/common';
import { Popover } from 'antd';
import Konva from 'konva';
import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../../store/useDrawing';
import { Layers } from '../../../types/Layers';

const PREVIEW_WIDTH = 62;
const PREVIEW_HEIGHT = 35;
const LARGE_PREVIEW_WIDTH = 160;
const LARGE_PREVIEW_HEIGHT = 90;

const PreviewCanvas: React.FC<Layers> = (props) => {
  const smallCanvasRef = useRef<HTMLCanvasElement>(null);
  const largeCanvasRef = useRef<HTMLCanvasElement>(null);
  const layerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [open, setOpen] = useState(false);

  const { stageRef } = useDrawingStore(
    useShallow((state) => ({
      stageRef: state.stageRef,
    }))
  );

  const renderLargePreview = () => {
    if (!open) return;
    const largeCanvas = largeCanvasRef.current;
    const layerCanvas = layerCanvasRef.current;
    if (!largeCanvas || !layerCanvas) return;

    const srcW = layerCanvas.width;
    const srcH = layerCanvas.height;
    if (!srcW || !srcH) return;

    const ctx = largeCanvas.getContext('2d');
    if (!ctx) return;

    largeCanvas.width = LARGE_PREVIEW_WIDTH;
    largeCanvas.height = LARGE_PREVIEW_HEIGHT;
    ctx.clearRect(0, 0, LARGE_PREVIEW_WIDTH, LARGE_PREVIEW_HEIGHT);

    const scale = Math.min(LARGE_PREVIEW_WIDTH / srcW, LARGE_PREVIEW_HEIGHT / srcH);
    const drawW = srcW * scale;
    const drawH = srcH * scale;
    const offsetX = (LARGE_PREVIEW_WIDTH - drawW) / 2;
    const offsetY = (LARGE_PREVIEW_HEIGHT - drawH) / 2;

    ctx.drawImage(layerCanvas, 0, 0, srcW, srcH, offsetX, offsetY, drawW, drawH);
  };

  useDebounceEffect(
    () => {
      requestIdleCallback(() => {
        const stage = stageRef?.current;
        const smallCanvas = smallCanvasRef.current;
        if (!stage || !smallCanvas) return;

        const layers = stage.getLayers();
        if (!layers?.length) return;

        const currentLayer = layers.find((layer) => layer.attrs.id === props.id);
        if (!currentLayer) return;

        const layerWidth = currentLayer.width();
        const layerHeight = currentLayer.height();
        if (!layerWidth || !layerHeight) return;

        // 使用离屏 Stage + 克隆 Layer，避免主画布缩放影响预览
        const clonedLayer = currentLayer.clone({ listening: false });
        const offscreenContainer = document.createElement('div');
        const offscreenStage = new Konva.Stage({
          container: offscreenContainer,
          width: layerWidth,
          height: layerHeight,
        });
        offscreenStage.add(clonedLayer);

        const layerCanvas = offscreenStage.toCanvas({
          pixelRatio: 1,
          x: 0,
          y: 0,
          width: layerWidth,
          height: layerHeight,
        });

        const smallCtx = smallCanvas.getContext('2d');
        if (!smallCtx) {
          offscreenStage.destroy();
          return;
        }

        const srcW = layerCanvas.width;
        const srcH = layerCanvas.height;
        if (!srcW || !srcH) {
          offscreenStage.destroy();
          return;
        }

        // 小预览：固定尺寸，按比例缩放居中
        smallCanvas.width = PREVIEW_WIDTH;
        smallCanvas.height = PREVIEW_HEIGHT;
        smallCtx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
        const smallScale = Math.min(PREVIEW_WIDTH / srcW, PREVIEW_HEIGHT / srcH);
        const smallDrawW = srcW * smallScale;
        const smallDrawH = srcH * smallScale;
        const smallOffsetX = (PREVIEW_WIDTH - smallDrawW) / 2;
        const smallOffsetY = (PREVIEW_HEIGHT - smallDrawH) / 2;
        smallCtx.drawImage(
          layerCanvas,
          0,
          0,
          srcW,
          srcH,
          smallOffsetX,
          smallOffsetY,
          smallDrawW,
          smallDrawH
        );

        layerCanvasRef.current = layerCanvas;

        offscreenStage.destroy();

        if (open) {
          renderLargePreview();
        }
      });
    },
    [props, open],
    {
      wait: 200,
    }
  );

  useEffect(() => {
    if (!open) return;
    renderLargePreview();
  }, [open]);

  return (
    <Popover
      placement="right"
      styles={{
        body: {
          padding: 0,
        },
      }}
      open={open}
      onOpenChange={setOpen}
      content={
        <canvas
          ref={largeCanvasRef}
          style={{ width: LARGE_PREVIEW_WIDTH, height: LARGE_PREVIEW_HEIGHT, display: 'block' }}
        />
      }
    >
      <canvas
        ref={smallCanvasRef}
        width={PREVIEW_WIDTH}
        height={PREVIEW_HEIGHT}
        style={{ display: 'block' }}
      />
    </Popover>
  );
};

export default PreviewCanvas;
