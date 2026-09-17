"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import type { StudioKPIs } from "@/lib/calculations/studio";

interface StudioActivityChartProps {
  studioKpis: StudioKPIs;
}

const CHART_COLORS = [
  "#D71920", // Recording - Red
  "#111111", // Production - Black
  "#666666", // Editing - Gray
  "#333333", // Mixing - Dark Gray
  "#444444", // Mastering
  "#999999", // Rehearsal
];

export function StudioActivityChart({ studioKpis }: StudioActivityChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (studioKpis.totalSessions === 0) {
    return (
      <EmptyState
        title="No data available yet"
        description="Add sessions to begin tracking studio activity."
      />
    );
  }

  const data = [
    { name: "Recording", count: studioKpis.recordingSessions },
    { name: "Production", count: studioKpis.productionSessions },
    { name: "Editing", count: studioKpis.editingSessions },
    { name: "Mixing", count: studioKpis.mixingSessions },
    { name: "Mastering", count: studioKpis.masteringSessions },
    { name: "Rehearsal", count: studioKpis.rehearsalSessions },
  ].filter((d) => d.count > 0);

  if (!mounted) {
    return <div className="h-64 w-full animate-pulse bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Total: <strong className="text-foreground">{studioKpis.totalSessions}</strong> sessions
        </span>
        <span>
          Hours: <strong className="text-foreground">{studioKpis.totalHours}h</strong>
        </span>
        <span>
          Avg: <strong className="text-foreground">{studioKpis.averageDurationMinutes}min</strong>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number) => [`${value} sessions`, "Count"]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #E5E5E5",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
