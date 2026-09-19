'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application boundary caught error:', error);
  }, [error]);

  return (
    <div className="min-h-[55vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 text-[#D71920] flex items-center justify-center mb-4 shadow-sm">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-bold font-display text-neutral-900 mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        An error occurred while loading this section of the portal. You can retry the request or contact support if the issue persists.
      </p>
      <Button
        onClick={() => reset()}
        className="flex items-center gap-2 bg-[#D71920] hover:bg-[#b0141a] text-white font-medium"
      >
        <RefreshCw className="h-4 w-4" /> Try again
      </Button>
    </div>
  );
}
