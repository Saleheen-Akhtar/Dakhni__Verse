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
  const [
    activeArtists,
    activeProjects,
    songsInProduction,
    songsReleased,
    studioSessions,
    studioHours,
    confirmedContributions,
    totalExpenses,
    pendingContributions,
  ] = await Promise.all([
    getActiveArtistCount(),
    getActiveProjectCount(),
    getProductionCount(),
    getReleasedSongCount(dateRange),
    getSessionCount(dateRange),
    getStudioHours(dateRange),
    getConfirmedContributions(dateRange),
    getTotalExpenses(dateRange),
    getPendingContributions(),
  ]);

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
