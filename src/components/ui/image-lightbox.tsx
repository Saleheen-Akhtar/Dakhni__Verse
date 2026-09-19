"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ImageLightboxProps {
  open: boolean;
  src?: string | null;
  alt?: string;
  title?: string;
  onClose: () => void;
}

export function ImageLightbox({ open, src, alt, title, onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll when open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        aria-label="Close image preview"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Title / Caption */}
      {title && (
        <div className="absolute top-5 left-6 z-10 text-white text-lg font-bold font-display tracking-wide drop-shadow-md">
          {title}
        </div>
      )}

      {/* Image container */}
      <div
        className="relative max-w-2xl max-h-[85vh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || title || "Profile Photo"}
          className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
        />
        {title && (
          <p className="mt-3 text-xs text-neutral-300 font-medium tracking-wider uppercase">
            {title}
          </p>
        )}
      </div>
    </div>
  );
}
