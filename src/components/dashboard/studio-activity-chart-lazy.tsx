'use client';

import dynamic from 'next/dynamic';
import type { StudioKPIs } from '@/lib/calculations/studio';

const StudioActivityChart = dynamic(
  () => import('./studio-activity-chart').then((m) => m.StudioActivityChart),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse bg-muted rounded-lg" />,
  }
);

export function StudioActivityChartLazy({ studioKpis }: { studioKpis: StudioKPIs }) {
  return <StudioActivityChart studioKpis={studioKpis} />;
}
