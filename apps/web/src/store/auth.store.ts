import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthCredentials = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  tenantId: string;
};

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  tenantId: string | null;
  setAuth: (_: AuthCredentials) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      tenantId: null,
      setAuth: ({ accessToken, refreshToken, userId, tenantId }: AuthCredentials) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        set({ accessToken, refreshToken, userId, tenantId });
      },
      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ accessToken: null, refreshToken: null, userId: null, tenantId: null });
      },
      isAuthenticated: () => !!get().accessToken,
    }),
    { name: 'auth-storage' },
  ),
);
