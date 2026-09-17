"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Calendar, ChevronDown } from "lucide-react";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DateRangePickerProps {
  value: DateRange | null;
  onChange: (range: DateRange) => void;
  className?: string;
}

const PRESETS = ["This Month", "Last Month", "Last 3 Months", "This Year", "Custom"] as const;
type Preset = typeof PRESETS[number];

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [preset, setPreset] = React.useState<Preset>("This Month");
  
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePresetChange = (p: Preset) => {
    setPreset(p);
    const now = new Date();
    
    if (p === "This Month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      onChange({ from, to });
      setIsOpen(false);
    } else if (p === "Last Month") {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      onChange({ from, to });
      setIsOpen(false);
    } else if (p === "Last 3 Months") {
      const from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      onChange({ from, to });
      setIsOpen(false);
    } else if (p === "This Year") {
      const from = new Date(now.getFullYear(), 0, 1);
      const to = new Date(now.getFullYear(), 11, 31);
      onChange({ from, to });
      setIsOpen(false);
    }
    // "Custom" keeps the dropdown open
  };

  const handleCustomDateChange = (type: "from" | "to", dateStr: string) => {
    if (!dateStr) return;
    const date = new Date(dateStr);
    
    if (value) {
      onChange({
        ...value,
        [type]: date
      });
    } else {
      onChange({
        from: type === "from" ? date : new Date(),
        to: type === "to" ? date : new Date()
      });
    }
  };

  const formatDate = (d: Date | null) => {
    if (!d) return "";
    return d.toISOString().split("T")[0];
  };

  const displayLabel = value 
    ? `${value.from.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${value.to.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : "Select date range";

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-[260px] justify-between transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 opacity-70" />
          <span className="font-medium text-foreground">{displayLabel}</span>
        </div>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-border z-50 p-2 animate-in fade-in-0 zoom-in-95">
          <div className="space-y-1 mb-3">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => handlePresetChange(p)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-sm transition-colors hover:bg-gray-100",
                  preset === p && "bg-gray-100 font-medium text-primary-red"
                )}
              >
                {p}
              </button>
            ))}
          </div>

          {preset === "Custom" && (
            <div className="p-3 border-t border-border space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-secondary-text">From</label>
                <input
                  type="date"
                  className="w-full text-sm border border-input rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-primary-red"
                  value={formatDate(value?.from || null)}
                  onChange={(e) => handleCustomDateChange("from", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-secondary-text">To</label>
                <input
                  type="date"
                  className="w-full text-sm border border-input rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-primary-red"
                  value={formatDate(value?.to || null)}
                  onChange={(e) => handleCustomDateChange("to", e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
