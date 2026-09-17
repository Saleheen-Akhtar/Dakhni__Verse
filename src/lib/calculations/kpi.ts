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
    .not("status", "in", '("Released","Cancelled")');

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
    .select("*", { count: "exact", head: true });

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
  let query = supabase.from("sessions").select("duration_minutes");

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
  const confirmedContributions = await getConfirmedContributions();
  const totalExpenses = await getTotalExpenses();
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

export async function getDashboardKPIs(dateRange?: DateRange): Promise<DashboardKPIs> {
  const supabase = await createClient();

  let releasesQuery = supabase
    .from("releases")
    .select("*", { count: "exact", head: true })
    .eq("status", "Released");

  let sessionsQuery = supabase
    .from("sessions")
    .select("duration_minutes");

  let contributionsQuery = supabase
    .from("contributions")
    .select("amount, status");

  let expensesQuery = supabase
    .from("expenses")
    .select("amount");

  if (dateRange) {
    const fromStr = dateRange.from.toISOString().split("T")[0];
    const toStr = dateRange.to.toISOString().split("T")[0];
    releasesQuery = releasesQuery.gte("release_date", fromStr).lte("release_date", toStr);
    sessionsQuery = sessionsQuery.gte("session_date", fromStr).lte("session_date", toStr);
    contributionsQuery = contributionsQuery.gte("contribution_date", fromStr).lte("contribution_date", toStr);
    expensesQuery = expensesQuery.gte("expense_date", fromStr).lte("expense_date", toStr);
  }

  const productionStatuses = new Set(["Production", "Recording", "Editing", "Mixing", "Mastering"]);

  const [
    artistsRes,
    projectsRes,
    releasesRes,
    sessionsRes,
    contributionsRes,
    expensesRes,
  ] = await Promise.all([
    supabase.from("artists").select("*", { count: "exact", head: true }).eq("status", "Active"),
    supabase.from("projects").select("status"),
    releasesQuery,
    sessionsQuery,
    contributionsQuery,
    expensesQuery,
  ]);

  const activeArtists = artistsRes.count ?? 0;

  const projectsData = projectsRes.data || [];
  const activeProjects = projectsData.filter((p) => p.status !== "Released" && p.status !== "Cancelled").length;
  const songsInProduction = projectsData.filter((p) => productionStatuses.has(p.status)).length;

  const songsReleased = releasesRes.count ?? 0;

  const sessionsData = sessionsRes.data || [];
  const studioSessions = sessionsData.length;
  const totalMinutes = sessionsData.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const studioHours = Math.round((totalMinutes / 60) * 10) / 10;

  const contributionsData = contributionsRes.data || [];
  const confirmedContributions = contributionsData
    .filter((c) => c.status === "Confirmed")
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const pendingContributions = contributionsData
    .filter((c) => c.status === "Pending")
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
}
