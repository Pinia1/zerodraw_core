import React from 'react';
import { Image, Layer } from 'react-konva';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../../store/useDrawing';

export const THUMBNAIL_LAYER_ID = '__interaction_thumbnail_layer__';

const Thumbnail: React.FC = () => {
  const { layerConfig, thumbnail } = useDrawingStore(
    useShallow((state) => ({
      layerConfig: state.layerConfig,
      thumbnail: state.thumbnail,
    }))
  );

  return (
    <Layer
      id={THUMBNAIL_LAYER_ID}
      x={layerConfig.x}
      y={layerConfig.y}
      clipWidth={layerConfig.width}
      clipHeight={layerConfig.height}
      listening={false}
    >
      {thumbnail && (
        <Image
          x={0}
          y={0}
          width={layerConfig.width}
          height={layerConfig.height}
          listening={false}
          image={thumbnail}
        />
      )}
    </Layer>
  );
};

export default React.memo(Thumbnail);
