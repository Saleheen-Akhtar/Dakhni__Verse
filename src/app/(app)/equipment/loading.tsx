import { Skeleton } from '@/components/ui/skeleton';

export default function EquipmentLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Search and filters */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-44" />
      </div>

      {/* Equipment table rows */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
