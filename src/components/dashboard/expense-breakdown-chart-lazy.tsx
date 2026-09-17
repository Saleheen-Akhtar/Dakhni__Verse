'use client';

import dynamic from 'next/dynamic';

const ExpenseBreakdownChart = dynamic(
  () => import('./expense-breakdown-chart').then((m) => m.ExpenseBreakdownChart),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse bg-muted rounded-lg" />,
  }
);

export function ExpenseBreakdownChartLazy({
  data,
}: {
  data?: Array<{ name: string; value: number }>;
}) {
  return <ExpenseBreakdownChart data={data} />;
}
