import { create } from 'zustand';

export type SymmetryMode = 'Off' | 'Vertical' | 'Horizontal';

interface SymmetryState {
  mode: SymmetryMode;
  setMode: (mode: SymmetryMode) => void;

  /** Center position of the symmetry axis (relative to the canvas layer) */
  position: { x: number; y: number };
  setPosition: (pos: { x: number; y: number }) => void;

  /** Rotation angle in degrees */
  rotation: number;
  setRotation: (deg: number) => void;
}

const useSymmetryStore = create<SymmetryState>()((set) => ({
  mode: 'Off',
  setMode: (mode: SymmetryMode) => set({ mode }),

  position: { x: -1, y: -1 },
  setPosition: (pos) => set({ position: pos }),

  rotation: 0,
  setRotation: (deg) => set({ rotation: deg }),
}));

export default useSymmetryStore;
