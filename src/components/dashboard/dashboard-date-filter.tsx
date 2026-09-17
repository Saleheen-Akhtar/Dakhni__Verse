"use client";

import { useRouter } from "next/navigation";
import { DateRangePicker } from "@/components/ui/date-range-picker";

interface DashboardDateFilterProps {
  initialRange: { from: string; to: string };
}

export function DashboardDateFilter({ initialRange }: DashboardDateFilterProps) {
  const router = useRouter();

  const handleDateRangeChange = (range: { from: Date; to: Date }) => {
    const fromStr = range.from.toISOString().split("T")[0];
    const toStr = range.to.toISOString().split("T")[0];
    router.push(`/dashboard?from=${fromStr}&to=${toStr}`);
  };

  return (
    <DateRangePicker
      value={{
        from: new Date(initialRange.from),
        to: new Date(initialRange.to),
      }}
      onChange={handleDateRangeChange}
    />
  );
}
