import { useKeyPress, useMemoizedFn } from '@zeroDraw/common';
import { useState } from 'react';

const useCtrlKeydown = () => {
  const [down, setDown] = useState(false);
  useKeyPress(
    'ctrl',
    useMemoizedFn(() => {
      setDown(true);
    }),
    {
      events: ['keydown'],
    }
  );
  useKeyPress(
    'ctrl',
    useMemoizedFn(() => {
      setDown(false);
    }),
    {
      events: ['keyup'],
    }
  );
  return [down];
};

export default useCtrlKeydown;
