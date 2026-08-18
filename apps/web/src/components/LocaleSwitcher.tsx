'use client';
import { useCurrency, Currency } from '@/components/CurrencyProvider';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, DollarSign, Euro } from 'lucide-react';
import Link from 'next/link';

export default function LocaleSwitcher({ currentLocale = 'en' }: { currentLocale?: 'en' | 'fr' | 'de' | 'ar' }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
      >
        <span className="font-medium">{currentLocale === 'fr' ? 'FR' : currentLocale === 'de' ? 'DE' : currentLocale === 'ar' ? 'AR' : 'EN'}</span>
        <span className="text-gray-300">|</span>
        <span className="flex items-center gap-0.5">
          {currency === 'USD' ? <DollarSign className="w-3.5 h-3.5" /> : <Euro className="w-3.5 h-3.5" />}
          {currency}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[160px] z-50">
          <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Language</div>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <span className={currentLocale === 'en' ? 'text-indigo-600 font-medium' : ''}>English</span>
            {currentLocale === 'en' && <span className="ml-auto text-indigo-600">✓</span>}
          </Link>
          <Link
            href="/fr"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <span className={currentLocale === 'fr' ? 'text-indigo-600 font-medium' : ''}>Français</span>
            {currentLocale === 'fr' && <span className="ml-auto text-indigo-600">✓</span>}
          </Link>
          <Link
            href="/de"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <span className={currentLocale === 'de' ? 'text-indigo-600 font-medium' : ''}>Deutsch</span>
            {currentLocale === 'de' && <span className="ml-auto text-indigo-600">✓</span>}
          </Link>
          <Link
            href="/ar"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <span className={currentLocale === 'ar' ? 'text-indigo-600 font-medium' : ''}>العربية</span>
            {currentLocale === 'ar' && <span className="ml-auto text-indigo-600">✓</span>}
          </Link>

          <div className="border-t border-gray-100 my-1" />

          <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Currency</div>
          <button
            onClick={() => { setCurrency('USD'); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5" />
            USD
            {currency === 'USD' && <span className="ml-auto text-indigo-600">✓</span>}
          </button>
          <button
            onClick={() => { setCurrency('EUR'); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Euro className="w-3.5 h-3.5" />
            EUR
            {currency === 'EUR' && <span className="ml-auto text-indigo-600">✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}
