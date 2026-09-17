"use client";

import { toast as baseToast, useToast } from "./toast";

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "error" | "info" | "warning";
}

export function toast(options: ToastOptions | string) {
  if (typeof options === "string") {
    baseToast({ description: options, variant: "info" });
    return;
  }

  const { title, description = "", variant = "info" } = options;

  let mappedVariant: "success" | "error" | "info" | "warning" = "info";
  if (variant === "destructive" || variant === "error") {
    mappedVariant = "error";
  } else if (variant === "success") {
    mappedVariant = "success";
  } else if (variant === "warning") {
    mappedVariant = "warning";
  }

  baseToast({
    title,
    description,
    variant: mappedVariant,
  });
}

export { useToast };
