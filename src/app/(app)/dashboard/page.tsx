import { Suspense } from "react";
import { getCurrentUserProfile } from "@/lib/auth/helpers";
import { getDashboardKPIs } from "@/lib/calculations/kpi";
import { getStudioKPIs } from "@/lib/calculations/studio";
import { getProductionWorkload } from "@/lib/calculations/production";
import { getRecentActivity } from "@/lib/activity/log";
import { getExpenseBreakdown } from "@/lib/queries/expenses";
import { formatCurrency } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { DashboardDateFilter } from "@/components/dashboard/dashboard-date-filter";
// Lazy wrappers: Recharts is loaded only after hydration, not in the initial bundle.
import { StudioActivityChartLazy } from "@/components/dashboard/studio-activity-chart-lazy";
import { ExpenseBreakdownChartLazy } from "@/components/dashboard/expense-breakdown-chart-lazy";
import { ProductionSummary } from "@/components/dashboard/production-summary";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity";
import { ArtistDashboard } from "@/components/dashboard/artist-dashboard";
import { ProducerDashboard } from "@/components/dashboard/producer-dashboard";
import {
  resolveArtistForUser,
  getArtistUpcomingSessions,
  getArtistPersonalProjects,
  getArtistPersonalReleases,
  getProducerUpcomingSessions,
  getProducerAssignedProjects,
} from "@/lib/queries/artist-portal";
import { getArtistKPIs } from "@/lib/calculations/artist-kpi";
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

function parseSafeDateRange(fromStr?: string, toStr?: string): { from: Date; to: Date } {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  let fromDate = defaultFrom;
  let toDate = defaultTo;

  if (fromStr) {
    const parsed = new Date(fromStr);
    if (!isNaN(parsed.getTime())) {
      fromDate = parsed;
    }
  }

  if (toStr) {
    const parsed = new Date(toStr);
    if (!isNaN(parsed.getTime())) {
      toDate = parsed;
    }
  }

  // Ensure from <= to
  if (fromDate > toDate) {
    const temp = fromDate;
    fromDate = toDate;
    toDate = temp;
  }

  // Cap absurdly large spans to 5 years maximum
  const maxSpanMs = 5 * 365 * 24 * 60 * 60 * 1000;
  if (toDate.getTime() - fromDate.getTime() > maxSpanMs) {
    fromDate = new Date(toDate.getTime() - maxSpanMs);
  }

  return { from: fromDate, to: toDate };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const dateRange = parseSafeDateRange(params?.from, params?.to);

  const profile = await getCurrentUserProfile();
  const userRole = profile?.role || "Artist";

  // If user is an Artist, render the dedicated Artist Portal Dashboard
  if (userRole === "Artist") {
    return <AsyncArtistDashboardSection profile={profile} />;
  }

  // If user is a Producer, render the dedicated Producer Portal Dashboard
  if (userRole === "Producer") {
    return <AsyncProducerDashboardSection profile={profile} />;
  }

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
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString(),
          }}
        />
      </div>

      {/* Core KPI Cards & Funds - Streamed RSC Boundary */}
      <Suspense fallback={<DashboardKPISkeleton />}>
        <AsyncDashboardKPIsSection dateRange={dateRange} />
      </Suspense>

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

      {/* Production Summary (Streamed) */}
      {userRole === "Manager" || userRole === "Producer" ? (
        <Suspense fallback={<div className="h-44 w-full animate-pulse bg-muted rounded-lg" />}>
          <AsyncProductionSection userRole={userRole} artistId={profile?.artist_id} />
        </Suspense>
      ) : null}

      {/* Recent Activity (Streamed) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </div>
            <div className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live
            </div>
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
  return <StudioActivityChartLazy studioKpis={studioKpis} />;
}

async function AsyncExpenseBreakdownSection({
  dateRange,
}: {
  dateRange: { from: Date; to: Date };
}) {
  const fromStr = dateRange.from.toISOString().split("T")[0];
  const toStr = dateRange.to.toISOString().split("T")[0];
  const expenseData = await getExpenseBreakdown(fromStr, toStr);

  return <ExpenseBreakdownChartLazy data={expenseData} />;
}

async function AsyncRecentActivitySection() {
  const recentActivity = await getRecentActivity(15);
  return <RecentActivityFeed activities={recentActivity} />;
}

async function AsyncProductionSection({
  userRole,
  artistId,
}: {
  userRole: string;
  artistId?: string | null;
}) {
  const workload = await getProductionWorkload(
    userRole === "Producer" ? artistId : null
  );
  return <ProductionSummary workload={workload} />;
}

function DashboardKPISkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-32 rounded-xl bg-muted animate-pulse" />
    </div>
  );
}

async function AsyncDashboardKPIsSection({
  dateRange,
}: {
  dateRange: { from: Date; to: Date };
}) {
  const kpis = await getDashboardKPIs(dateRange);

  return (
    <>
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
    </>
  );
}

async function AsyncArtistDashboardSection({ profile }: { profile: any }) {
  const artist = profile ? await resolveArtistForUser(profile) : null;
  const artistId = artist?.id || profile?.artist_id;

  const [kpis, upcomingSessions, projects, releases, recentActivities] = await Promise.all([
    artistId
      ? getArtistKPIs(artistId)
      : Promise.resolve({
          activeProjects: 0,
          completedProjects: 0,
          releasedSongs: 0,
          sessionsAttended: 0,
          studioHoursMinutes: 0,
          studioHours: 0,
          upcomingReleases: 0,
          lastActivity: null,
        }),
    artistId ? getArtistUpcomingSessions(artistId) : Promise.resolve([]),
    artistId ? getArtistPersonalProjects(artistId, 6) : Promise.resolve([]),
    artistId ? getArtistPersonalReleases(artistId, 4) : Promise.resolve([]),
    getRecentActivity(15),
  ]);

  return (
    <ArtistDashboard
      userName={profile?.name || "Artist"}
      artist={artist}
      kpis={kpis}
      upcomingSessions={upcomingSessions}
      projects={projects}
      releases={releases}
      recentActivities={recentActivities}
    />
  );
}

async function AsyncProducerDashboardSection({ profile }: { profile: any }) {
  const artist = profile ? await resolveArtistForUser(profile) : null;
  const artistId = artist?.id || profile?.artist_id;

  const [workload, upcomingSessions, projects, recentActivities] = await Promise.all([
    getProductionWorkload(artistId),
    getProducerUpcomingSessions(artistId, 5),
    getProducerAssignedProjects(artistId, 6),
    getRecentActivity(15),
  ]);

  return (
    <ProducerDashboard
      userName={profile?.name || "Producer"}
      artist={artist}
      workload={workload}
      upcomingSessions={upcomingSessions}
      projects={projects}
      recentActivities={recentActivities}
    />
  );
}

