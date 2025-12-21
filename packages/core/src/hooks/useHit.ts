import { useMemoizedFn } from '@zeroDraw/common';
import { useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useHitStore from '../store/useHit';
import useToolsStore from '../store/useTools';
import { Actions } from '../types/Drawing';

const useHit = ({ opacity, id }: { opacity: number; id: string }) => {
  const removeTagRef = useRef(false);
  const [shapeOpacity, setShapeOpacity] = useState(opacity || 1);
  const activeKey = useToolsStore(useShallow((s) => s.activeKey));

  const handleMouseEnter = useMemoizedFn(() => {
    if (removeTagRef.current) return;
    if (activeKey !== Actions.REMOVE) return;

    const { isHit, hitIds } = useHitStore.getState();
    if (!isHit) return;

    removeTagRef.current = true;

    setShapeOpacity((prev) => prev * 0.2);

    if (!hitIds.includes(id)) {
      useHitStore.getState().setHitIds([...hitIds, id]);
    }
  });

  return {
    shapeOpacity,
    handleMouseEnter,
  };
};

export default useHit;
