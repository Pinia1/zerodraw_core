import { useMemoizedFn } from '@zeroDraw/common';
import { useRef, useState } from 'react';
import useHitStore from '../store/useHit';

const useHit = ({ opacity, id }: { opacity: number; id: string }) => {
  const removeTagRef = useRef(false);
  const [shapeOpacity, setShapeOpacity] = useState(opacity || 1);

  const handleMouseEnter = useMemoizedFn(() => {
    if (removeTagRef.current) return;

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
