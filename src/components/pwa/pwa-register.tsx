'use client';

import { useEffect, useRef } from 'react';
import { toast } from '@/components/ui/toast';

export function PwaRegister() {
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Only reload on controllerchange if the page was ALREADY controlled by an older worker.
    // If hadController is false, this is a first-time install, so reloading would disrupt forms (e.g. /join).
    const hadController = Boolean(navigator.serviceWorker.controller);

    const handleControllerChange = () => {
      if (refreshingRef.current || !hadController) return;

      // Don't auto-reload if the user is currently on an active submission form
      const pathname = window.location.pathname;
      if (pathname.startsWith('/join') || pathname.startsWith('/artist-form')) {
        return;
      }

      refreshingRef.current = true;
      toast({
        title: 'App Updated',
        description: 'New updates applied. Refreshing...',
        variant: 'info',
        duration: 2000,
      });
      setTimeout(() => {
        window.location.reload();
      }, 600);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    let activeRegistration: ServiceWorkerRegistration | null = null;
    let lastCheck = Date.now();

    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible' && activeRegistration && now - lastCheck > 30 * 60 * 1000) {
        lastCheck = now;
        activeRegistration.update().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Register service worker with native W3C updateViaCache: 'none'
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        activeRegistration = registration;

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((err) => {
        console.warn('PWA registration:', err);
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}
