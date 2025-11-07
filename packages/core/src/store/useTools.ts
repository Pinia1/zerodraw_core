import { create } from 'zustand';
import { Actions } from '../types/Drawing';

interface ToolsState {
  activeKey: Actions;
  setActiveKey: (key: Actions) => void;
}

const useToolsStore = create<ToolsState>()((set, get) => ({
  activeKey: Actions.PEN,

  setActiveKey: (key: Actions) => set({ activeKey: key }),
}));

export default useToolsStore;
