import { create } from 'zustand';

interface ThumbnailState {
  thumbnails: Record<string, string>;
  setLayerThumbnail: (id: string, url: string) => void;
  clearLayerThumbnail: (id: string) => void;
}

const useThumbnailStore = create<ThumbnailState>()((set) => ({
  thumbnails: {},
  setLayerThumbnail: (id, url) =>
    set((state) => {
      const prev = state.thumbnails[id];
      if (prev) URL.revokeObjectURL(prev);
      return { thumbnails: { ...state.thumbnails, [id]: url } };
    }),
  clearLayerThumbnail: (id) =>
    set((state) => {
      const prev = state.thumbnails[id];
      if (prev) URL.revokeObjectURL(prev);
      const { [id]: _, ...rest } = state.thumbnails;
      return { thumbnails: rest };
    }),
}));

export default useThumbnailStore;
