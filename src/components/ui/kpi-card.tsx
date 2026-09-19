import * as React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface KPICardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  href?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function KPICard({ label, value, icon, href, trend, className, ...props }: KPICardProps) {
  const content = (
    <div 
      className={cn(
        "rounded-xl border border-border bg-white p-6 shadow-sm transition-all flex flex-col justify-between h-full min-h-[140px]",
        href && "hover:shadow-md hover:border-gray-300",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between space-x-2 pb-2">
        <p className="text-sm font-medium tracking-tight text-secondary-text">{label}</p>
        {icon && <div className="text-muted-foreground opacity-70">{icon}</div>}
      </div>
      <div>
        <div className="text-2xl font-bold font-display text-foreground">{value}</div>
        {trend && (
          <p className={cn("text-xs mt-1 font-medium", trend.isPositive ? "text-green-600" : "text-red-600")}>
            {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
            <span className="text-secondary-text ml-1 font-normal">from last period</span>
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} prefetch={false} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}
