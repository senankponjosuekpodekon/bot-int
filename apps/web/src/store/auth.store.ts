import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userId: string | null;
  tenantId: string | null;
  setAuth: (token: string, userId: string, tenantId: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      userId: null,
      tenantId: null,
      setAuth: (token, userId, tenantId) => {
        localStorage.setItem('access_token', token);
        set({ token, userId, tenantId });
      },
      logout: () => {
        localStorage.removeItem('access_token');
        set({ token: null, userId: null, tenantId: null });
      },
      isAuthenticated: () => !!get().token,
    }),
    { name: 'auth-storage' },
  ),
);
