import { create } from 'zustand';

export type SymmetryMode = 'Off' | 'Vertical' | 'Horizontal';

const MODE_ROTATION: Record<Exclude<SymmetryMode, 'Off'>, number> = {
  Vertical: 0,
  Horizontal: 90,
};

interface SymmetryState {
  mode: SymmetryMode;
  setMode: (mode: SymmetryMode, canvasSize?: { width: number; height: number }) => void;

  /** Center position of the symmetry axis (relative to the canvas layer) */
  position: { x: number; y: number };
  setPosition: (pos: { x: number; y: number }) => void;

  /** Rotation angle in degrees */
  rotation: number;
  setRotation: (deg: number) => void;
}

const useSymmetryStore = create<SymmetryState>()((set) => ({
  mode: 'Off',
  setMode: (mode: SymmetryMode, canvasSize?) =>
    set((state) => ({
      mode,
      rotation: mode !== 'Off' ? MODE_ROTATION[mode] : state.rotation,
      position:
        mode !== 'Off' && canvasSize
          ? { x: canvasSize.width / 2, y: canvasSize.height / 2 }
          : state.position,
    })),

  position: { x: -1, y: -1 },
  setPosition: (pos) => set({ position: pos }),

  rotation: 0,
  setRotation: (deg) => set({ rotation: deg }),
}));

export default useSymmetryStore;
