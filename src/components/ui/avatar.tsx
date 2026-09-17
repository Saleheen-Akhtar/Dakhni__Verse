import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Avatar({ src, alt, fallback, size = "md", className, ...props }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const initials = fallback ? getInitials(fallback) : "?";

  if (src && !imgError) {
    return (
      <div
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden rounded-full",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <img
          src={src}
          alt={alt || fallback || "Avatar"}
          className="aspect-square h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-dv-black text-white font-display font-semibold",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {initials}
    </div>
  );
}

export { Avatar };
