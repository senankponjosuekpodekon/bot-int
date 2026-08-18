'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Currency = 'USD' | 'EUR';

export const CURRENCY_RATES: Record<Currency, { rate: number; symbol: string; locale: string }> = {
  USD: { rate: 1.08, symbol: '$', locale: 'en-US' },
  EUR: { rate: 1, symbol: '€', locale: 'fr-FR' },
};

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (eurAmount: number) => string;
  formatOverage: (eurCents: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('USD');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('stiamond-currency') : null;
    if (saved === 'USD' || saved === 'EUR') {
      setCurrencyState(saved);
      return;
    }

    // 1. Try IP-based geolocation (more accurate than browser locale)
    if (typeof window !== 'undefined') {
      fetch('https://ipapi.co/json/')
        .then((res) => res.json())
        .then((data: { currency?: string; country?: string }) => {
          if (data.currency === 'EUR' || data.country === 'FR' || data.country === 'DE' || data.country === 'ES' || data.country === 'IT' || data.country === 'NL' || data.country === 'BE' || data.country === 'PT' || data.country === 'AT' || data.country === 'IE') {
            setCurrencyState('EUR');
          } else {
            setCurrencyState('USD');
          }
        })
        .catch(() => {
          // 2. Fallback: detect from browser locale
          if (typeof navigator !== 'undefined') {
            const lang = navigator.language || '';
            if (lang.startsWith('fr') || lang.startsWith('de') || lang.startsWith('es') || lang.startsWith('it') || lang.startsWith('nl') || lang.startsWith('pt') || lang.startsWith('be') || lang.startsWith('at') || lang.startsWith('ie')) {
              setCurrencyState('EUR');
            }
          }
        });
    }
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    if (typeof window !== 'undefined') localStorage.setItem('stiamond-currency', c);
  };

  const formatPrice = (eurAmount: number): string => {
    const { rate, symbol, locale } = CURRENCY_RATES[currency];
    const converted = Math.round(eurAmount * rate);
    if (currency === 'USD') return `$${converted}`;
    return `${converted}${symbol}`;
  };

  const formatOverage = (eurCents: number): string => {
    const { rate, symbol } = CURRENCY_RATES[currency];
    const converted = (eurCents / 100) * rate;
    if (currency === 'USD') return `$${converted.toFixed(2)}/conversation`;
    return `${converted.toFixed(2).replace('.', ',')}${symbol}/conversation`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, formatOverage }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
