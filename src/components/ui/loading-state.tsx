import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted bg-gray-200", className)}
      {...props}
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-white p-6 shadow-sm", className)}>
      <Skeleton className="h-6 w-1/3 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-4" />
      <Skeleton className="h-10 w-full mt-4" />
    </div>
  );
}

export function KPICardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-white p-6 shadow-sm flex flex-col justify-between h-full min-h-[140px]", className)}>
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col space-y-6 w-full animate-in fade-in-50">
      <div className="flex justify-between items-center pb-4 border-b border-border">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 hidden sm:block" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>
      <TableSkeleton />
    </div>
  );
}
