"use client";

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
  data?: Array<{ name: string; value: number }>;
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

export function ExpenseBreakdownChart({ data = [] }: ExpenseBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No data available yet"
        description="Record expenses to see category breakdown."
      />
    );
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
