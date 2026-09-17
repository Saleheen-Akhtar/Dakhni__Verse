import { getCurrentUserProfile } from "@/lib/auth/helpers";
import { getDashboardKPIs } from "@/lib/calculations/kpi";
import { getStudioKPIs } from "@/lib/calculations/studio";
import { getRecentActivity } from "@/lib/activity/log";
import { getExpenseSummary } from "@/lib/queries/expenses";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

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
  const fromStr = dateRange.from.toISOString().split("T")[0];
  const toStr = dateRange.to.toISOString().split("T")[0];

  const [profile, kpis, studioKpis, recentActivity, expenseSummary] = await Promise.all([
    getCurrentUserProfile(),
    getDashboardKPIs(dateRange),
    getStudioKPIs(dateRange),
    getRecentActivity(15),
    getExpenseSummary(fromStr, toStr),
  ]);

  const initialExpenseData = Object.entries(expenseSummary.byCategory || {})
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <DashboardClient
      initialKpis={kpis}
      studioKpis={studioKpis}
      recentActivity={recentActivity}
      initialExpenseData={initialExpenseData}
      userRole={profile?.role || "Artist"}
      initialDateRange={{
        from: startOfMonth.toISOString(),
        to: endOfMonth.toISOString(),
      }}
    />
  );
}
