import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
  "2xl": "h-24 w-24 text-2xl",
};

const sizePixels = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  "2xl": 96,
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
  const isDataUrl = src?.startsWith('data:');
  const px = sizePixels[size];

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
        {isDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt || fallback || "Avatar"}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Image
            src={src}
            alt={alt || fallback || "Avatar"}
            width={px}
            height={px}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
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
