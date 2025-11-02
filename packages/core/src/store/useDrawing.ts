import Konva from 'konva';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DrawingState {
  stageRef: React.RefObject<Konva.Stage> | null;
  bindRef: (ref: React.RefObject<Konva.Stage>) => void;
}

export const useDrawingStore = create<DrawingState>()(
  persist(
    (set, get) => ({
      stageRef: null,
      bindRef: (ref: DrawingState['stageRef']) => set({ stageRef: ref }),
    }),
    {
      name: 'drawing-storage',
      partialize: (state) => ({}),
    }
  )
);
