import { create } from 'zustand';

export interface AIRenderState {
  visible: boolean;
  prompt: string;
  strength: number;
  steps: number;
  opacity: number;

  setVisible: (v: boolean) => void;
  setPrompt: (p: string) => void;
  setStrength: (s: number) => void;
  setSteps: (s: number) => void;
  setOpacity: (o: number) => void;
}

const useAIRenderStore = create<AIRenderState>()((set) => ({
  visible: false,
  prompt: 'concept art, detailed illustration, vivid colors, cinematic lighting',
  strength: 0.65,
  steps: 4,
  opacity: 0.85,

  setVisible: (v) => set({ visible: v }),
  setPrompt: (p) => set({ prompt: p }),
  setStrength: (s) => set({ strength: s }),
  setSteps: (s) => set({ steps: s }),
  setOpacity: (o) => set({ opacity: o }),
}));

export default useAIRenderStore;
