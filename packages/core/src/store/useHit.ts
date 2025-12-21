import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HitConfigState {
  isHit: boolean;
  setIsHit: (isHit: boolean) => void;
  hitIds: string[];
  setHitIds: (hitIds: string[]) => void;
  getHitIds: () => string[];
}
const useHitStore = create<HitConfigState>()(
  persist(
    (set, get) => ({
      isHit: false,
      setIsHit: (isHit: boolean) => set({ isHit }),
      hitIds: [],
      setHitIds: (hitIds: string[]) => set({ hitIds }),
      getHitIds: () => get().hitIds,
    }),
    {
      name: 'fill-hit-storage',
      partialize: (state) => ({}),
    }
  )
);

export default useHitStore;
