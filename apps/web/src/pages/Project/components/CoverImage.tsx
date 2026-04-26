import { FileOutlined } from '@ant-design/icons';
import type { ProjectItem } from '@zeroDraw/api-contract';
import { loadStageCover } from '@zeroDraw/core';
import React, { useEffect, useState } from 'react';
import { getR2ThumbnailUrl } from '../../../utils';
import { EmptyThumb } from '../../Project/components';

const CoverImage: React.FC<{ item: ProjectItem }> = ({ item }) => {
  const [localCover, setLocalCover] = useState<string | null>(null);

  useEffect(() => {
    if (item.thumbnailKey) return;
    let revoked = false;
    loadStageCover(item.id).then((url) => {
      if (!revoked && url) setLocalCover(url);
    });
    return () => {
      revoked = true;
      if (localCover) URL.revokeObjectURL(localCover);
    };
  }, []);

  if (item.thumbnailKey) {
    return <img src={getR2ThumbnailUrl(item.thumbnailKey!)} alt={item.name} />;
  }
  if (localCover) {
    return <img src={localCover} alt={item.name} />;
  }
  return (
    <EmptyThumb>
      <FileOutlined style={{ fontSize: 24, color: '#444' }} />
    </EmptyThumb>
  );
};

export default CoverImage;
