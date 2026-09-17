import { Skeleton } from '@/components/ui/skeleton';

export default function ReleasesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Filters row */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* List / Table rows */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
