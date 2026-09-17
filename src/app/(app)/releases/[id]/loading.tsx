import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ReleaseDetailLoading() {
  return (
    <div className="py-6 max-w-3xl mx-auto space-y-6">
      {/* Top action bar */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Main Release Card */}
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/40">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
