import { useMount } from '@zeroDraw/common';
import Konva from 'konva';
import { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDrawingStore } from '../store/useDrawing';

const useBindRef = () => {
  const { bindRef, stageRef } = useDrawingStore(
    useShallow((state) => ({
      bindRef: state.bindRef,
      stageRef: state.stageRef,
    }))
  );
  const ref = useRef<Konva.Stage>(null);

  useMount(() => {
    bindRef(ref);
  });

  return stageRef;
};

export default useBindRef;
