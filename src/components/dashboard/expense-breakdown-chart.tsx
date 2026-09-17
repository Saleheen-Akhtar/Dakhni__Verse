"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils/format";

interface ExpenseBreakdownChartProps {
  dateRange: { from: Date; to: Date };
}

const COLORS = [
  "#D71920",
  "#111111",
  "#333333",
  "#555555",
  "#777777",
  "#999999",
  "#AAAAAA",
  "#BBBBBB",
  "#CCCCCC",
  "#DDDDDD",
];

export function ExpenseBreakdownChart({ dateRange }: ExpenseBreakdownChartProps) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<Array<{ name: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [dateRange]);

  async function loadData() {
    setLoading(true);
    try {
      // Import dynamically to avoid server/client issues
      const { getExpenseSummary } = await import("@/lib/queries/expenses");
      const summary = await getExpenseSummary(
        dateRange.from.toISOString().split("T")[0],
        dateRange.to.toISOString().split("T")[0]
      );
      const chartData = Object.entries(summary.byCategory)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      setData(chartData);
    } catch (error) {
      console.error("Error loading expense data:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="h-64 w-full animate-pulse bg-muted rounded-lg" />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title="No data available yet"
        description="Record expenses to see category breakdown."
      />
    );
  }

  if (!mounted) {
    return <div className="h-64 w-full animate-pulse bg-muted rounded-lg" />;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), "Amount"]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #E5E5E5",
            fontSize: "12px",
          }}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span className="text-xs text-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
