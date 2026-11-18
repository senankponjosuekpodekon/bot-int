'use client';

import { useCallback, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: any;
  }
}

// Loads the Cloudflare Turnstile script on demand and runs an invisible
// challenge per call, mirroring apps/api embed-script.ts. Returns a token for
// the /widget/* endpoints, or null when no site key is configured or the
// challenge fails (the API decides whether a token is required).
export function useTurnstile(siteKey?: string | null) {
  const loadingRef = useRef<Promise<any> | null>(null);

  const load = useCallback((): Promise<any> => {
    if (!siteKey) return Promise.resolve(null);
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (window.turnstile) return Promise.resolve(window.turnstile);
    loadingRef.current ||= new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
    return loadingRef.current;
  }, [siteKey]);

  const execute = useCallback(async (): Promise<string | null> => {
    const ts = await load();
    if (!ts) return null;
    return new Promise((resolve) => {
      const holder = document.createElement('div');
      holder.style.display = 'none';
      document.body.appendChild(holder);
      let done = false;
      const finish = (t: string | null) => {
        if (done) return;
        done = true;
        try {
          ts.remove(holder);
        } catch {
          /* noop */
        }
        resolve(t);
      };
      try {
        const wid = ts.render(holder, {
          sitekey: siteKey,
          size: 'invisible',
          callback: (t: string) => finish(t),
          'error-callback': () => finish(null),
          'timeout-callback': () => finish(null),
        });
        ts.execute(wid);
      } catch {
        finish(null);
      }
    });
  }, [load, siteKey]);

  return { execute };
}
