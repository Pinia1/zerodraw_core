import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Actions } from '../pages/Flow/components/ToolBar/type';

interface FlowState {
  toolActive: Actions | null;
  setToolActive: (toolActive: Actions | null) => void;
}

export const useFlowStore = create<FlowState>()(
  persist(
    (set) => ({
      toolActive: Actions.ROPE,
      setToolActive: (toolActive) => set({ toolActive }),
    }),
    {
      name: 'flow-storage', // localStorage key
      partialize: (state) => ({}),
    }
  )
);
