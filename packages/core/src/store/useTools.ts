import { create } from 'zustand';
import { Actions } from '../types/Drawing';

export type ReferencePictureState = {
  src: string;
  visible: boolean;
  /** fixed-position in viewport pixels */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 0-1 */
  opacity: number;
  locked?: boolean;
};

interface ToolsState {
  activeKey: Actions;
  setActiveKey: (key: Actions) => void;

  referencePicture: ReferencePictureState;
  setReferencePicture: (picture: string) => void;
  updateReferencePicture: (patch: Partial<ReferencePictureState>) => void;
  clearReferencePicture: () => void;
}

const useToolsStore = create<ToolsState>()((set) => ({
  activeKey: Actions.PEN,

  setActiveKey: (key: Actions) => set({ activeKey: key }),

  referencePicture: {
    src: '',
    visible: false,
    x: 24,
    y: 88,
    width: 320,
    height: 240,
    opacity: 0.7,
    locked: false,
  },
  setReferencePicture: (picture: string) =>
    set((state) => ({
      referencePicture: {
        ...state.referencePicture,
        src: picture,
        visible: !!picture,
      },
    })),
  updateReferencePicture: (patch) =>
    set((state) => ({
      referencePicture: {
        ...state.referencePicture,
        ...patch,
      },
    })),
  clearReferencePicture: () =>
    set((state) => ({
      referencePicture: {
        ...state.referencePicture,
        src: '',
        visible: false,
      },
    })),
}));

export default useToolsStore;
