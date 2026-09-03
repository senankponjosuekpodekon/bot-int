import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { businessApi } from '@/lib/api';

export interface Business {
  id: string;
  name: string;
  isDefault: boolean;
}

interface BusinessState {
  businesses: Business[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  load: () => Promise<void>;
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set, get) => ({
      businesses: [],
      selectedId: null,
      setSelectedId: (id: string) => set({ selectedId: id }),
      load: async () => {
        const businesses: Business[] = await businessApi.list();
        set({ businesses });
        const current = get().selectedId;
        if (businesses.length && !current) {
          const defaultBusiness = businesses.find((b) => b.isDefault) || businesses[0];
          set({ selectedId: defaultBusiness.id });
        }
      },
    }),
    { name: 'business-storage' },
  ),
);
