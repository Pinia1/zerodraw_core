import { useDebounceEffect } from '@zeroDraw/common';
import Konva from 'konva';
import React, { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../../store/useDrawing';
import { Layers } from '../../../types/Layers';
import { layerFilterToCssFilter } from '../../../utils/BlendMode';

const PREVIEW_WIDTH = 62;
const PREVIEW_HEIGHT = 35;

const PreviewCanvas: React.FC<Layers> = (props) => {
  const smallCanvasRef = useRef<HTMLCanvasElement>(null);
  const layerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const { stageRef } = useDrawingStore(
    useShallow((state) => ({
      stageRef: state.stageRef,
    }))
  );

  useDebounceEffect(
    () => {
      requestAnimationFrame(() => {
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
        smallCtx.save();
        smallCtx.filter = layerFilterToCssFilter(props.filter);
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
        smallCtx.restore();

        layerCanvasRef.current = layerCanvas;

        offscreenStage.destroy();
      });
    },
    [props],
    {
      wait: 200,
    }
  );

  return (
    <canvas
      ref={smallCanvasRef}
      width={PREVIEW_WIDTH}
      height={PREVIEW_HEIGHT}
      style={{ display: 'block' }}
    />
  );
};

export default PreviewCanvas;
