import React from 'react';
import { Layers } from '../../types/Layers';

interface LayerItemProps extends Layers {}

const LayerItem: React.FC<LayerItemProps> = () => {
  return <div>LayerItem</div>;
};

export default React.memo(LayerItem);
