import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  const sub = subtitle || description;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 pb-6 border-b border-border mb-6",
        className
      )}
      {...props}
    >
      <div className="flex flex-col space-y-1.5">
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
          {title}
        </h1>
        {sub && <p className="text-muted-foreground text-sm">{sub}</p>}
      </div>
      {actions && (
        <div className="flex items-center space-x-2">{actions}</div>
      )}
    </div>
  );
}
