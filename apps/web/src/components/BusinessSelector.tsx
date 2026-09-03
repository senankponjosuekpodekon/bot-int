'use client';

import { useEffect } from 'react';
import { useBusinessStore } from '@/store/business.store';

export default function BusinessSelector() {
  const { businesses, selectedId, setSelectedId, load } = useBusinessStore();

  useEffect(() => {
    load();
  }, [load]);

  if (businesses.length < 2) return null;

  return (
    <select
      value={selectedId || ''}
      onChange={(e) => setSelectedId(e.target.value)}
      className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      aria-label="Sélectionner un business"
    >
      {businesses.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}
