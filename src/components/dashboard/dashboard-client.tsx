"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Music,
  Mic,
  Disc,
  Calendar,
  Clock,
  IndianRupee,
  Receipt,
  Wallet,
  AlertTriangle,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { KPICard } from "@/components/ui/kpi-card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DashboardKPIs } from "@/lib/calculations/kpi";
import type { StudioKPIs } from "@/lib/calculations/studio";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { getDashboardKPIs } from "@/lib/calculations/kpi";
import { getStudioKPIs } from "@/lib/calculations/studio";
import { getRecentActivity } from "@/lib/activity/log";
import { ExpenseBreakdownChart } from "./expense-breakdown-chart";
import { StudioActivityChart } from "./studio-activity-chart";
import { ProductionSummary } from "./production-summary";
import { RecentActivityFeed } from "./recent-activity";

interface DashboardClientProps {
  initialKpis: DashboardKPIs;
  studioKpis: StudioKPIs;
  recentActivity: any[];
  userRole: string;
  initialDateRange: { from: string; to: string };
}

export function DashboardClient({
  initialKpis,
  studioKpis,
  recentActivity,
  userRole,
  initialDateRange,
}: DashboardClientProps) {
  const [kpis, setKpis] = useState(initialKpis);
  const [studio, setStudio] = useState(studioKpis);
  const [activity, setActivity] = useState(recentActivity);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(initialDateRange.from),
    to: new Date(initialDateRange.to),
  });
  const [loading, setLoading] = useState(false);

  const handleDateRangeChange = async (range: { from: Date; to: Date }) => {
    setDateRange(range);
    setLoading(true);
    try {
      const [newKpis, newStudio, newActivity] = await Promise.all([
        getDashboardKPIs(range),
        getStudioKPIs(range),
        getRecentActivity(15),
      ]);
      setKpis(newKpis);
      setStudio(newStudio);
      setActivity(newActivity);
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">
            DAKHNI VERSE
          </h1>
          <p className="text-muted-foreground mt-1">
            Studio & Collective Overview
          </p>
        </div>
        <DateRangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
        />
      </div>

      {/* Core KPI Cards */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${loading ? "opacity-60" : ""}`}>
        <KPICard
          label="Active Artists"
          value={kpis.activeArtists}
          icon={<Users className="h-4 w-4" />}
          href="/artists?status=Active"
        />
        <KPICard
          label="Active Projects"
          value={kpis.activeProjects}
          icon={<Music className="h-4 w-4" />}
          href="/projects?status=active"
        />
        <KPICard
          label="In Production"
          value={kpis.songsInProduction}
          icon={<Mic className="h-4 w-4" />}
          href="/projects?status=Production"
        />
        <KPICard
          label="Songs Released"
          value={kpis.songsReleased}
          icon={<Disc className="h-4 w-4" />}
          href="/releases?status=Released"
        />
        <KPICard
          label="Studio Sessions"
          value={kpis.studioSessions}
          icon={<Calendar className="h-4 w-4" />}
          href="/sessions"
        />
        <KPICard
          label="Studio Hours"
          value={`${kpis.studioHours}h`}
          icon={<Clock className="h-4 w-4" />}
        />
        <KPICard
          label="Contributions"
          value={formatCurrency(kpis.confirmedContributions)}
          icon={<IndianRupee className="h-4 w-4" />}
          href="/finance"
        />
        <KPICard
          label="Expenses"
          value={formatCurrency(kpis.totalExpenses)}
          icon={<Receipt className="h-4 w-4" />}
          href="/finance"
        />
      </div>

      {/* Available Funds - Prominent Card */}
      <Card className="border-2 border-dv-black">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Available Funds
              </p>
              <p className="text-4xl font-bold font-display mt-1">
                {formatCurrency(kpis.availableFunds)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Confirmed Contributions − Total Expenses
              </p>
            </div>
            <div className="hidden sm:block">
              <Wallet className="h-12 w-12 text-muted-foreground/30" />
            </div>
          </div>
          {kpis.pendingContributions > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Pending Contributions:{" "}
                <span className="font-semibold text-amber-600">
                  {formatCurrency(kpis.pendingContributions)}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Studio Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Studio Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <StudioActivityChart studioKpis={studio} />
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseBreakdownChart dateRange={dateRange} />
          </CardContent>
        </Card>
      </div>

      {/* Production Summary (The Bear's view) */}
      {userRole === "Manager" || userRole === "Producer" ? (
        <ProductionSummary />
      ) : null}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivityFeed activities={activity} />
        </CardContent>
      </Card>
    </div>
  );
}
