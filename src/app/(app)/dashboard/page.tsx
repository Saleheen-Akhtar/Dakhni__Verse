import { Suspense } from "react";
import { getCurrentUserProfile } from "@/lib/auth/helpers";
import { getDashboardKPIs } from "@/lib/calculations/kpi";
import { getStudioKPIs } from "@/lib/calculations/studio";
import { getRecentActivity } from "@/lib/activity/log";
import { getExpenseBreakdown } from "@/lib/queries/expenses";
import { formatCurrency } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { DashboardDateFilter } from "@/components/dashboard/dashboard-date-filter";
import { StudioActivityChart } from "@/components/dashboard/studio-activity-chart";
import { ExpenseBreakdownChart } from "@/components/dashboard/expense-breakdown-chart";
import { ProductionSummary } from "@/components/dashboard/production-summary";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity";
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
  Activity,
} from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const startOfMonth = params?.from
    ? new Date(params.from)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = params?.to
    ? new Date(params.to)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const dateRange = { from: startOfMonth, to: endOfMonth };

  const [profile, kpis] = await Promise.all([
    getCurrentUserProfile(),
    getDashboardKPIs(dateRange),
  ]);

  const userRole = profile?.role || "Artist";

  return (
    <div className="space-y-8">
      {/* Header with isolated date filter client component */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">
            DAKHNI VERSE
          </h1>
          <p className="text-muted-foreground mt-1">
            Studio & Collective Overview
          </p>
        </div>
        <DashboardDateFilter
          initialRange={{
            from: startOfMonth.toISOString(),
            to: endOfMonth.toISOString(),
          }}
        />
      </div>

      {/* Core KPI Cards - 100% Server Rendered */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Available Funds - Prominent Card (Server Rendered) */}
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

      {/* Charts Row - Independent RSC Streaming Boundaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Studio Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Studio Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-64 w-full animate-pulse bg-muted rounded-lg" />}>
              <AsyncStudioActivitySection dateRange={dateRange} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-64 w-full animate-pulse bg-muted rounded-lg" />}>
              <AsyncExpenseBreakdownSection dateRange={dateRange} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Production Summary (Server Rendered) */}
      {userRole === "Manager" || userRole === "Producer" ? (
        <ProductionSummary />
      ) : null}

      {/* Recent Activity (Streamed) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-48 w-full animate-pulse bg-muted rounded-lg" />}>
            <AsyncRecentActivitySection />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function AsyncStudioActivitySection({
  dateRange,
}: {
  dateRange: { from: Date; to: Date };
}) {
  const studioKpis = await getStudioKPIs(dateRange);
  return <StudioActivityChart studioKpis={studioKpis} />;
}

async function AsyncExpenseBreakdownSection({
  dateRange,
}: {
  dateRange: { from: Date; to: Date };
}) {
  const fromStr = dateRange.from.toISOString().split("T")[0];
  const toStr = dateRange.to.toISOString().split("T")[0];
  const expenseData = await getExpenseBreakdown(fromStr, toStr);

  return <ExpenseBreakdownChart data={expenseData} />;
}

async function AsyncRecentActivitySection() {
  const recentActivity = await getRecentActivity(15);
  return <RecentActivityFeed activities={recentActivity} />;
}
