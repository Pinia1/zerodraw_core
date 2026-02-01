import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  avatar: string;
  email: string;
  name: string;
  bio: string;
  blog: string;
}

interface UserState {
  user: User | null;
  isLoggedIn: boolean;

  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,

      setUser: (user) => set({ user, isLoggedIn: !!user }),
      logout: () => {
        set({ user: null, isLoggedIn: false });
        localStorage.setItem('token', '');
      },
    }),
    {
      name: 'user-storage', // localStorage key
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);
