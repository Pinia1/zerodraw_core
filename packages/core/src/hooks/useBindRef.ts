import { useMount } from '@monorepo/common';
import Konva from 'konva';
import { useRef } from 'react';
import { useDrawingStore } from '../store/useDrawing';

const useBindRef = () => {
  const bindRef = useDrawingStore((state) => state.bindRef);
  const stageRef = useDrawingStore((state) => state.stageRef);
  const ref = useRef<Konva.Stage>(null);

  useMount(() => {
    bindRef(ref);
  });

  return stageRef;
};

export default useBindRef;
