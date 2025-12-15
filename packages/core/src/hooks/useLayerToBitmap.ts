import { cropTransparentBorder, generateUUID } from '@monorepo/common';
import Konva from 'konva';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../store/useDrawing';
import { Fill as FillType, Layers } from '../types/Layers';
import imageManager from '../utils/imageManager';
import useBindRef from './useBindRef';

const useLayerToBitmap = () => {
  const stageRef = useBindRef();
  const [loading, setLoading] = useState(false);

  const { layerConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
    }))
  );

  const run = async (layer: Layers, group: Konva.Group) => {
    try {
      setLoading(true);
      return new Promise(async (resolve) => {
        if (layer && !layer.diagrams?.length) {
          resolve(layer);
          console.log('return 1');

          return;
        }

        // If there is no change.
        if (
          layer.diagrams.length === 1 &&
          layer.diagrams[0].type === 'image' &&
          layer.image &&
          layer.image?.rotation === undefined
        ) {
          resolve(layer);
          console.log('return 2');
          return;
        }

        const stage = stageRef?.current;
        if (!stage) return;

        // 克隆 Group 节点用于离屏截图
        const clonedGroup = group.clone();

        // 创建离屏 Stage（不添加到 DOM，不会显示）
        const offscreenContainer = document.createElement('div');
        const offscreenStage = new Konva.Stage({
          container: offscreenContainer,
          width: layerConfig.width,
          height: layerConfig.height,
        });

        // 创建离屏 Layer 并添加克隆的 Group
        const offscreenLayer = new Konva.Layer({
          x: 0,
          y: 0,
          clipWidth: layerConfig.width,
          clipHeight: layerConfig.height,
        });
        offscreenStage.add(offscreenLayer);
        offscreenLayer.add(clonedGroup);

        // 在离屏 Stage 上获取坐标（未缩放）
        const groupRect = clonedGroup.getClientRect();

        const isFiniteRect =
          Number.isFinite(groupRect.x) &&
          Number.isFinite(groupRect.y) &&
          Number.isFinite(groupRect.width) &&
          Number.isFinite(groupRect.height);

        if (!isFiniteRect) {
          resolve(layer);
          return;
        }

        let relativeX = 0;
        let relativeY = 0;
        let clipWidth = 0;
        let clipHeight = 0;
        let clipLeft = 0;
        let clipTop = 0;

        const targetWidth = 1920;
        let pixelRatio = targetWidth / layerConfig.width;
        pixelRatio = Math.max(1, Math.min(pixelRatio, 3));

        // Layer 边界（离屏 Stage 中 Layer 位置是 0,0）
        const layerX = 0;
        const layerY = 0;
        const layerWidth = layerConfig.width;
        const layerHeight = layerConfig.height;

        if (groupRect.x < layerX) {
          relativeX = 0;
          clipWidth = layerX - groupRect.x;
          clipLeft = layerX - groupRect.x;
        } else {
          relativeX = groupRect.x - layerX;
        }

        if (groupRect.x + groupRect.width > layerX + layerWidth) {
          clipWidth = groupRect.x + groupRect.width - (layerX + layerWidth);
        }

        if (groupRect.y < layerY) {
          relativeY = 0;
          clipHeight = layerY - groupRect.y;
          clipTop = layerY - groupRect.y;
        } else {
          relativeY = groupRect.y - layerY;
        }

        if (groupRect.y + groupRect.height > layerY + layerHeight) {
          clipHeight = groupRect.y + groupRect.height - (layerY + layerHeight);
        }

        const layerCanvas = clonedGroup.toCanvas();

        const trueWidth = groupRect.width - clipWidth;
        const imageData = layerCanvas
          .getContext('2d')
          ?.getImageData(clipLeft, clipTop, trueWidth, groupRect.height - clipHeight);

        if (layer.image?.maxWidth) {
          pixelRatio = Math.max(layer.image.maxWidth / trueWidth, pixelRatio);
        }

        const { bounds } = cropTransparentBorder(imageData!);

        const blob = (await clonedGroup.toBlob({
          pixelRatio: pixelRatio,
          mimeType: 'image/webp',
          quality: 1,
          x: Math.max(groupRect.x, layerX) + bounds.left,
          y: Math.max(groupRect.y, layerY) + bounds.top,
          width: bounds.width,
          height: bounds.height,
        })) as Blob;

        // 销毁离屏资源
        offscreenStage.destroy();

        const id = generateUUID();

        blob.arrayBuffer().then(async (buffer) => {
          imageManager.saveImage(id, buffer);
        });

        const img = new window.Image();
        img.src = URL.createObjectURL(blob);
        img.onload = () => {
          const image: FillType = {
            x: relativeX + bounds.left,
            y: relativeY + bounds.top,
            width: bounds.width,
            height: bounds.height,
            id,
            img,
            src: img.src,
            visible: true,
            maxWidth: Math.min(3000, img.width),
          };

          /**
           *the loading time of fills is quite long,
           * so it is better to keep fills in order to convert them into bitmaps more quickly.
           */
          const newDrawingLayer = {
            ...layer!,
            image: image,
            lines: [],
            eraserLines: [],
            rects: [],
            ellipses: [],
            paths: [],
            fills: [],
            diagrams: [{ id: image.id, type: 'image' as const }],
          };

          resolve(newDrawingLayer);
          // replaceCurrentHistory(layers.map((i) => (i.id === layer.id ? newDrawingLayer : i)));
        };
        img.onerror = () => {
          console.log('return error');
        };
      });
    } catch (error) {
      console.log(error, 'error');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    run,
  };
};

export default useLayerToBitmap;
