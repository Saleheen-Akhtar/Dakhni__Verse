'use client';

import { useEffect, useRef } from 'react';
import { toast } from '@/components/ui/toast';

export function PwaRegister() {
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // 1. When a new service worker takes control, automatically reload to apply updates
    const handleControllerChange = () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      toast({
        title: 'App Updated',
        description: 'New version available. Refreshing...',
        variant: 'info',
        duration: 2000,
      });
      setTimeout(() => {
        window.location.reload();
      }, 800);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // 2. Register service worker and wire automatic update checks
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // If there is already a waiting worker, tell it to activate immediately
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Listen for new worker installation
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version is installed and waiting; tell it to skip waiting and take over
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // 3. Proactively check for updates immediately on load
        registration.update().catch(() => {});

        // 4. Proactively check for updates whenever user returns to the app / unminimizes
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        };

        const handleFocus = () => {
          registration.update().catch(() => {});
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        // 5. Periodic background check every 5 minutes
        const intervalId = setInterval(() => {
          registration.update().catch(() => {});
        }, 5 * 60 * 1000);

        return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('focus', handleFocus);
          clearInterval(intervalId);
        };
      })
      .catch((err) => {
        console.warn('PWA Service Worker registration failed:', err);
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}
