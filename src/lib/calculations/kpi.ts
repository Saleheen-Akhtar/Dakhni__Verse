"use server";

import { createClient } from "@/lib/supabase/server";
import type { DateRange } from "@/types";

/**
 * Core KPI Calculation Functions
 *
 * Every function queries real data from the database.
 * No hardcoded values. All period-sensitive KPIs accept a date range.
 */

// === Artist KPIs ===

export async function getActiveArtistCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("artists")
    .select("*", { count: "exact", head: true })
    .eq("status", "Active");

  if (error) {
    console.error("Error counting active artists:", error);
    return 0;
  }
  return count ?? 0;
}

// === Project KPIs ===

export async function getActiveProjectCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .not("status", "in", '("Released","On Hold","Cancelled")');

  if (error) {
    console.error("Error counting active projects:", error);
    return 0;
  }
  return count ?? 0;
}

export async function getProductionCount(): Promise<number> {
  const supabase = await createClient();
  const productionStatuses = ["Production", "Recording", "Editing", "Mixing", "Mastering"];
  const { count, error } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .in("status", productionStatuses);

  if (error) {
    console.error("Error counting production projects:", error);
    return 0;
  }
  return count ?? 0;
}

export async function getReleasedSongCount(dateRange?: DateRange): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("releases")
    .select("*", { count: "exact", head: true })
    .eq("status", "Released");

  if (dateRange) {
    query = query
      .gte("release_date", dateRange.from.toISOString().split("T")[0])
      .lte("release_date", dateRange.to.toISOString().split("T")[0]);
  }

  const { count, error } = await query;
  if (error) {
    console.error("Error counting released songs:", error);
    return 0;
  }
  return count ?? 0;
}

// === Session KPIs ===

export async function getSessionCount(dateRange?: DateRange): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .not("status", "eq", "Cancelled");

  if (dateRange) {
    query = query
      .gte("session_date", dateRange.from.toISOString().split("T")[0])
      .lte("session_date", dateRange.to.toISOString().split("T")[0]);
  }

  const { count, error } = await query;
  if (error) {
    console.error("Error counting sessions:", error);
    return 0;
  }
  return count ?? 0;
}

export async function getStudioHours(dateRange?: DateRange): Promise<number> {
  const supabase = await createClient();
  let query = supabase.from("sessions").select("duration_minutes").not("status", "eq", "Cancelled");

  if (dateRange) {
    query = query
      .gte("session_date", dateRange.from.toISOString().split("T")[0])
      .lte("session_date", dateRange.to.toISOString().split("T")[0]);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error calculating studio hours:", error);
    return 0;
  }

  const totalMinutes = (data || []).reduce(
    (sum, s) => sum + (s.duration_minutes || 0),
    0
  );
  return Math.round((totalMinutes / 60) * 10) / 10; // Round to 1 decimal
}

// === Financial KPIs ===

export async function getConfirmedContributions(dateRange?: DateRange): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("contributions")
    .select("amount")
    .eq("status", "Confirmed");

  if (dateRange) {
    query = query
      .gte("contribution_date", dateRange.from.toISOString().split("T")[0])
      .lte("contribution_date", dateRange.to.toISOString().split("T")[0]);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error summing contributions:", error);
    return 0;
  }

  return (data || []).reduce((sum, c) => sum + Number(c.amount), 0);
}

export async function getPendingContributions(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contributions")
    .select("amount")
    .eq("status", "Pending");

  if (error) {
    console.error("Error summing pending contributions:", error);
    return 0;
  }

  return (data || []).reduce((sum, c) => sum + Number(c.amount), 0);
}

export async function getTotalExpenses(dateRange?: DateRange): Promise<number> {
  const supabase = await createClient();
  let query = supabase.from("expenses").select("amount");

  if (dateRange) {
    query = query
      .gte("expense_date", dateRange.from.toISOString().split("T")[0])
      .lte("expense_date", dateRange.to.toISOString().split("T")[0]);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error summing expenses:", error);
    return 0;
  }

  return (data || []).reduce((sum, e) => sum + Number(e.amount), 0);
}

export async function getAvailableFunds(): Promise<number> {
  const [confirmedContributions, totalExpenses] = await Promise.all([
    getConfirmedContributions(),
    getTotalExpenses(),
  ]);
  return confirmedContributions - totalExpenses;
}

// === Dashboard Aggregate ===

export interface DashboardKPIs {
  activeArtists: number;
  activeProjects: number;
  songsInProduction: number;
  songsReleased: number;
  studioSessions: number;
  studioHours: number;
  confirmedContributions: number;
  totalExpenses: number;
  availableFunds: number;
  pendingContributions: number;
}

import { measureQuery } from "@/lib/telemetry/perf";

export async function getDashboardKPIs(dateRange?: DateRange): Promise<DashboardKPIs> {
  return measureQuery("getDashboardKPIs", async () => {
    const supabase = await createClient();

  // 1. Try native database-side RPC aggregation (fastest, single roundtrip)
  try {
    const fromStr = dateRange ? dateRange.from.toISOString().split("T")[0] : null;
    const toStr = dateRange ? dateRange.to.toISOString().split("T")[0] : null;

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_kpis_rpc', {
      p_from: fromStr,
      p_to: toStr,
    });

    if (!rpcError && rpcData) {
      return {
        activeArtists: Number(rpcData.activeArtists || 0),
        activeProjects: Number(rpcData.activeProjects || 0),
        songsInProduction: Number(rpcData.songsInProduction || 0),
        songsReleased: Number(rpcData.songsReleased || 0),
        studioSessions: Number(rpcData.studioSessions || 0),
        studioHours: Number(rpcData.studioHours || 0),
        confirmedContributions: Number(rpcData.confirmedContributions || 0),
        pendingContributions: Number(rpcData.pendingContributions || 0),
        totalExpenses: Number(rpcData.totalExpenses || 0),
        availableFunds: Number(rpcData.availableFunds || 0),
      };
    }
    if (rpcError) {
      console.warn("get_dashboard_kpis_rpc failed, falling back to queries:", rpcError.message);
    }
  } catch (err: any) {
    console.warn("get_dashboard_kpis_rpc exception, falling back to queries:", err?.message);
  }

  let releasesQuery = supabase
    .from("releases")
    .select("*", { count: "exact", head: true })
    .eq("status", "Released");

  let sessionsQuery = supabase
    .from("sessions")
    .select("duration_minutes", { count: "exact" })
    .not("status", "eq", "Cancelled");

  let expensesQuery = supabase
    .from("expenses")
    .select("amount");

  const productionStatuses = ["Production", "Recording", "Editing", "Mixing", "Mastering"];

  // Use SQL count queries instead of fetching all rows
  let activeProjectsQuery = supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .not("status", "in", '("Released","On Hold","Cancelled")');

  let productionQuery = supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .in("status", productionStatuses);

  // For contributions, split into two count+sum queries
  let confirmedContribQuery = supabase
    .from("contributions")
    .select("amount")
    .eq("status", "Confirmed");

  let pendingContribQuery = supabase
    .from("contributions")
    .select("amount")
    .eq("status", "Pending");

  if (dateRange) {
    const fromStr = dateRange.from.toISOString().split("T")[0];
    const toStr = dateRange.to.toISOString().split("T")[0];
    releasesQuery = releasesQuery.gte("release_date", fromStr).lte("release_date", toStr);
    sessionsQuery = sessionsQuery.gte("session_date", fromStr).lte("session_date", toStr);
    expensesQuery = expensesQuery.gte("expense_date", fromStr).lte("expense_date", toStr);
    confirmedContribQuery = confirmedContribQuery.gte("contribution_date", fromStr).lte("contribution_date", toStr);
    pendingContribQuery = pendingContribQuery.gte("contribution_date", fromStr).lte("contribution_date", toStr);
  }

  const [
    artistsRes,
    activeProjectsRes,
    productionRes,
    releasesRes,
    sessionsRes,
    confirmedContribRes,
    pendingContribRes,
    expensesRes,
  ] = await Promise.all([
    supabase.from("artists").select("*", { count: "exact", head: true }).eq("status", "Active"),
    activeProjectsQuery,
    productionQuery,
    releasesQuery,
    sessionsQuery,
    confirmedContribQuery,
    pendingContribQuery,
    expensesQuery,
  ]);

  const activeArtists = artistsRes.count ?? 0;
  const activeProjects = activeProjectsRes.count ?? 0;
  const songsInProduction = productionRes.count ?? 0;
  const songsReleased = releasesRes.count ?? 0;

  // Sessions still need row data for duration sum (no SQL SUM in Supabase client)
  const sessionsData = sessionsRes.data || [];
  const studioSessions = sessionsRes.count ?? sessionsData.length;
  const totalMinutes = sessionsData.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const studioHours = Math.round((totalMinutes / 60) * 10) / 10;

  // Pre-filtered contribution sums
  const confirmedContributions = (confirmedContribRes.data || [])
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const pendingContributions = (pendingContribRes.data || [])
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const expensesData = expensesRes.data || [];
  const totalExpenses = expensesData.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const availableFunds = confirmedContributions - totalExpenses;

    return {
      activeArtists,
      activeProjects,
      songsInProduction,
      songsReleased,
      studioSessions,
      studioHours,
      confirmedContributions,
      totalExpenses,
      availableFunds,
      pendingContributions,
    };
  });
}
