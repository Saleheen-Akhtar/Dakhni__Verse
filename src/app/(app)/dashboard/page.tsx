import { getCurrentUserProfile } from "@/lib/auth/helpers";
import { getDashboardKPIs } from "@/lib/calculations/kpi";
import { getStudioKPIs } from "@/lib/calculations/studio";
import { getRecentActivity } from "@/lib/activity/log";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  // Fetch all dashboard data with current month as default
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const dateRange = { from: startOfMonth, to: endOfMonth };

  const [profile, kpis, studioKpis, recentActivity] = await Promise.all([
    getCurrentUserProfile(),
    getDashboardKPIs(dateRange),
    getStudioKPIs(dateRange),
    getRecentActivity(15),
  ]);

  return (
    <DashboardClient
      initialKpis={kpis}
      studioKpis={studioKpis}
      recentActivity={recentActivity}
      userRole={profile?.role || "Artist"}
      initialDateRange={{
        from: startOfMonth.toISOString(),
        to: endOfMonth.toISOString(),
      }}
    />
  );
}
