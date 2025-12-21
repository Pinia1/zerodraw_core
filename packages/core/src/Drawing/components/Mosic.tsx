import { useMediaQuery } from '@zeroDraw/common';
import React from 'react';
import { Layer, Rect } from 'react-konva';
import useImage from 'use-image';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';
import { msk, mskWhite } from '../../utils/base64img';

export const MOSIC_LAYER_ID = '__interaction_mosic_layer__';

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
      id={MOSIC_LAYER_ID}
    >
      <Rect
        x={0}
        y={0}
        width={layerConfig.width}
        height={layerConfig.height}
        fill={layerConfig.backgroundVisible ? layerConfig.backgroundColor : undefined}
        listening={false}
        fillPatternImage={layerConfig.backgroundVisible ? undefined : image}
        fillPatternScale={
          layerConfig.backgroundVisible
            ? undefined
            : {
                x: 0.18 / stageConfig.scale,
                y: 0.18 / stageConfig.scale,
              }
        }
      />
    </Layer>
  );
};

export default React.memo(Mosic);
