import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminTokenState {
  token: string;
  setToken: (token: string) => void;
  clearToken: () => void;
}

export const useAdminTokenStore = create<AdminTokenState>()(
  persist(
    (set) => ({
      token: '',
      setToken: (token) => set({ token }),
      clearToken: () => set({ token: '' }),
    }),
    {
      name: 'zerodraw-agent-admin-token',
      partialize: (state) => ({ token: state.token }),
    },
  ),
);
