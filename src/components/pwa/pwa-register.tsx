'use client';

import { useEffect, useRef } from 'react';
import { toast } from '@/components/ui/toast';

export function PwaRegister() {
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // 1. When a new service worker takes over, smoothly refresh to show new code
    const handleControllerChange = () => {
      if (refreshingRef.current) return;
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

    // 2. Register service worker with native W3C updateViaCache: 'none'
    // This tells the browser's native C++ engine to check for updates natively
    // without running any JavaScript polling loops or background timers.
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        // If there's already an updated worker waiting, activate it immediately
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // When a new worker is installed in background, tell it to take over
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // 3. Passive resume check: ONLY when the user returns to the app after being away
        // Debounced to at least 30 minutes so it never runs during active app usage
        let lastCheck = Date.now();
        const handleVisibilityChange = () => {
          const now = Date.now();
          if (document.visibilityState === 'visible' && now - lastCheck > 30 * 60 * 1000) {
            lastCheck = now;
            registration.update().catch(() => {});
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      })
      .catch((err) => {
        console.warn('PWA registration:', err);
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}
