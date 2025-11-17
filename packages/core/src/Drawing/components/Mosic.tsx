import { useMediaQuery } from '@monorepo/common';
import React from 'react';
import { Layer, Rect } from 'react-konva';
import useImage from 'use-image';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import { msk, mskWhite } from '../../utils/base64img';

const Mosic: React.FC = () => {
  const [windowTheme] = useMediaQuery();
  const { layerConfig, stageConfig } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
      stageConfig: state.stageConfig,
    }))
  );
  const [image] = useImage(windowTheme === 'dark' ? msk : mskWhite);
  return (
    <Layer
      x={layerConfig.x}
      y={layerConfig.y}
      clipWidth={layerConfig.width}
      clipHeight={layerConfig.height}
      listening={false}
    >
      <Rect
        x={0}
        y={0}
        width={layerConfig.width}
        height={layerConfig.height}
        listening={false}
        fillPatternImage={image}
        fillPatternScale={{
          x: 0.16 / stageConfig.scale,
          y: 0.16 / stageConfig.scale,
        }}
      />
    </Layer>
  );
};

export default React.memo(Mosic);
