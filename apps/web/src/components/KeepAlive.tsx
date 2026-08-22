'use client';

import { useEffect } from 'react';

const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes

function ping() {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return;

  const url = base.endsWith('/api') ? `${base}/health` : `${base}/api/health`;

  fetch(url, { method: 'GET' })
    .then((res) => {
      if (!res.ok) {
        console.warn('[KeepAlive] API ping failed', res.status);
      }
    })
    .catch(() => {
      // Silently ignore network errors to not flood the console
    });
}

export default function KeepAlive() {
  useEffect(() => {
    ping();
    const id = setInterval(ping, KEEP_ALIVE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return null;
}
