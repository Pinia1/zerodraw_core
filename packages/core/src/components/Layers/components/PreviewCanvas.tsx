import React from 'react';
import { Layers } from '../../../types/Layers';
import useThumbnailStore from '../../../store/useThumbnail';
import { layerFilterToCssFilter } from '../../../utils/BlendMode';

const PREVIEW_WIDTH = 62;
const PREVIEW_HEIGHT = 35;

const PreviewCanvas: React.FC<Layers> = ({ id, filter }) => {
  const thumbnail = useThumbnailStore((state) => state.thumbnails[id]);

  return (
    <div style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, display: 'block' }}>
      {thumbnail && (
        <img
          src={thumbnail}
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
          style={{
            display: 'block',
            objectFit: 'contain',
            filter: layerFilterToCssFilter(filter),
          }}
        />
      )}
    </div>
  );
};

export default React.memo(PreviewCanvas);
