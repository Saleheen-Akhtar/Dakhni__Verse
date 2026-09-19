'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('PWA Service Worker registered with scope:', registration.scope);
          }
        })
        .catch((err) => {
          console.warn('PWA Service Worker registration failed:', err);
        });
    }
  }, []);

  return null;
}
