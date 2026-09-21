'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function ProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // When pathname or search params change, complete and hide progress
  useEffect(() => {
    clearTimers();
    if (loading) {
      setProgress(100);
      const timeout = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [pathname, searchParams, loading]);

  // Intercept click on internal links to trigger immediate progress feedback
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Ignore external, download, hash, or modified clicks
      if (
        href.startsWith('http') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        target.hasAttribute('download') ||
        target.getAttribute('target') === '_blank' ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if clicking current URL
      const currentUrl = window.location.pathname + window.location.search;
      if (href === currentUrl) return;

      // Clear any running timers and start progress
      clearTimers();
      setLoading(true);
      setProgress(25);
      const t1 = setTimeout(() => setProgress(65), 150);
      const t2 = setTimeout(() => setProgress(85), 400);
      timersRef.current = [t1, t2];
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => {
      clearTimers();
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[3px] z-[9999] pointer-events-none transition-all duration-300 ease-out"
      style={{
        width: `${progress}%`,
        backgroundColor: '#D71920',
        boxShadow: '0 0 8px rgba(215, 25, 32, 0.6)',
        opacity: progress === 100 ? 0 : 1,
        transition: progress === 100 ? 'all 200ms ease-out' : 'width 300ms ease-in-out',
      }}
    />
  );
}

export function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarInner />
    </Suspense>
  );
}
