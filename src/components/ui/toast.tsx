"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { createPortal } from "react-dom";

type ToastVariant = "success" | "error" | "info" | "warning" | "destructive" | "default";

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (props: Omit<ToastProps, "id">) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

let globalToast: (props: Omit<ToastProps, "id">) => void = () => {};
export const toast = (props: Omit<ToastProps, "id">) => globalToast(props);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    return {
      toast: (props: Omit<ToastProps, "id">) => {
        if (typeof window !== "undefined") {
          globalToast(props);
        }
      },
    };
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    globalToast = (props) => addToast(props);
  }, []);

  const addToast = (props: Omit<ToastProps, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...props, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {mounted && createPortal(
        <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastProps; onRemove: () => void }) {
  const { title, description, variant = "info", duration = 5000 } = toast;

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onRemove();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onRemove]);

  const variantClasses = {
    default: "border-border bg-white text-foreground",
    success: "border-green-500 bg-green-50 text-green-900",
    error: "border-red-500 bg-red-50 text-red-900",
    destructive: "border-red-500 bg-red-50 text-red-900",
    info: "border-blue-500 bg-blue-50 text-blue-900",
    warning: "border-amber-500 bg-amber-50 text-amber-900",
  };

  const icons = {
    default: <Info className="h-5 w-5 text-muted-foreground" />,
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    destructive: <AlertCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  };

  return (
    <div className={cn(
      "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all animate-in slide-in-from-right-full mb-4",
      variantClasses[variant]
    )}>
      <div className="flex items-start space-x-3">
        {icons[variant]}
        <div className="flex flex-col space-y-1">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          <p className="text-sm opacity-90">{description}</p>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="absolute right-2 top-2 rounded-md p-1 opacity-50 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
