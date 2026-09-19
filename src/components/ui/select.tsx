"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";

interface SelectContextValue {
  value: string;
  onValueChange: (val: string) => void;
  open: boolean;
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  selectedLabel: string;
  setSelectedLabel: (label: string) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: { value: string; label: string }[];
}

interface CompoundSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  children?: React.ReactNode;
  className?: string;
}

const Select = React.forwardRef<any, any>(
  (props, ref) => {
    // Check if compound select usage
    if (props.onValueChange !== undefined || props.defaultValue !== undefined || (props.children && !Array.isArray(props.children) && typeof props.children === "object" && "type" in (props.children as any) && (props.children as any).type !== "option")) {
      return <CompoundSelect {...props} ref={ref} />;
    }

    const { className, options, children, ...rest } = props as NativeSelectProps;
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-dv-gray-light px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...rest}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
    );
  }
);
Select.displayName = "Select";

function CompoundSelect({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  children,
  className,
}: CompoundSelectProps & { ref?: any }) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const [selectedLabel, setSelectedLabel] = React.useState("");

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleValueChange = (newVal: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newVal);
    }
    onValueChange?.(newVal);
    setOpen(false);
  };

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange: handleValueChange,
        open,
        setOpen,
        selectedLabel,
        setSelectedLabel,
      }}
    >
      <div ref={containerRef} className={cn("relative", className || "w-full")}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);

  return (
    <button
      type="button"
      ref={ref}
      onClick={() => ctx?.setOpen((prev) => !prev)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-dv-gray-light px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }
>(({ placeholder, className, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);
  const displayText = ctx?.selectedLabel || ctx?.value || placeholder || "";

  return (
    <span
      ref={ref}
      className={cn(
        "truncate block text-left",
        !ctx?.value && placeholder ? "text-muted-foreground" : "text-foreground",
        className
      )}
      {...props}
    >
      {displayText}
    </span>
  );
});
SelectValue.displayName = "SelectValue";

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);

  if (!ctx?.open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-white py-1 shadow-md text-sm animate-in fade-in-80",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
SelectContent.displayName = "SelectContent";

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ value, className, children, ...props }, ref) => {
    const ctx = React.useContext(SelectContext);
    const isSelected = ctx?.value === value;

    React.useEffect(() => {
      if (isSelected && typeof children === "string") {
        ctx.setSelectedLabel(children);
      }
    }, [isSelected, children]);

    return (
      <div
        ref={ref}
        onClick={() => {
          if (typeof children === "string") {
            ctx?.setSelectedLabel(children);
          }
          ctx?.onValueChange(value);
        }}
        className={cn(
          "relative flex cursor-pointer select-none items-center justify-between rounded-sm px-3 py-2 hover:bg-dv-gray-light text-sm outline-none transition-colors",
          isSelected && "bg-dv-gray-light font-medium",
          className
        )}
        {...props}
      >
        <span>{children}</span>
        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
      </div>
    );
  }
);
SelectItem.displayName = "SelectItem";

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
};
