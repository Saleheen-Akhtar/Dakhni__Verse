"use server";

import { createClient } from "@/lib/supabase/server";
import type { DateRange } from "@/types";

/**
 * Studio KPI calculations.
 * Session breakdowns by type, average duration, sessions by artist.
 */

export interface StudioKPIs {
  totalSessions: number;
  recordingSessions: number;
  productionSessions: number;
  editingSessions: number;
  mixingSessions: number;
  masteringSessions: number;
  rehearsalSessions: number;
  totalHours: number;
  averageDurationMinutes: number;
  sessionsByArtist: Array<{ artist_name: string; count: number }>;
}

import { measureQuery } from "@/lib/telemetry/perf";

export async function getStudioKPIs(dateRange?: DateRange): Promise<StudioKPIs> {
  return measureQuery("getStudioKPIs", async () => {
    const supabase = await createClient();

  // 1. Try native database-side RPC aggregation
  try {
    const fromStr = dateRange ? dateRange.from.toISOString().split("T")[0] : null;
    const toStr = dateRange ? dateRange.to.toISOString().split("T")[0] : null;

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_studio_kpis_rpc', {
      p_from: fromStr,
      p_to: toStr,
    });

    if (!rpcError && rpcData) {
      return rpcData as StudioKPIs;
    }
    if (rpcError) {
      console.warn("get_studio_kpis_rpc failed, falling back to query:", rpcError.message);
    }
  } catch (err: any) {
    console.warn("get_studio_kpis_rpc exception, falling back to query:", err?.message);
  }

  let query = supabase.from("sessions").select(
    "session_type, duration_minutes, artist:artists!artist_id(stage_name)"
  ).not("status", "eq", "Cancelled").limit(500);

  if (dateRange) {
    query = query
      .gte("session_date", dateRange.from.toISOString().split("T")[0])
      .lte("session_date", dateRange.to.toISOString().split("T")[0]);
  }

  const { data: sessions, error } = await query;

  if (error || !sessions) {
    console.error("Error fetching studio KPIs:", error);
    return {
      totalSessions: 0,
      recordingSessions: 0,
      productionSessions: 0,
      editingSessions: 0,
      mixingSessions: 0,
      masteringSessions: 0,
      rehearsalSessions: 0,
      totalHours: 0,
      averageDurationMinutes: 0,
      sessionsByArtist: [],
    };
  }

  const typeCount = (type: string) =>
    sessions.filter((s: any) => s.session_type === type).length;

  const totalMinutes = sessions.reduce(
    (sum: number, s: any) => sum + (s.duration_minutes || 0),
    0
  );

  // Sessions by artist
  const artistCounts: Record<string, number> = {};
  sessions.forEach((s: any) => {
    const name = s.artist?.stage_name || "Unknown";
    artistCounts[name] = (artistCounts[name] || 0) + 1;
  });

  const sessionsByArtist = Object.entries(artistCounts)
    .map(([artist_name, count]) => ({ artist_name, count }))
    .sort((a, b) => b.count - a.count);

    return {
      totalSessions: sessions.length,
      recordingSessions: typeCount("Recording"),
      productionSessions: typeCount("Production"),
      editingSessions: typeCount("Editing"),
      mixingSessions: typeCount("Mixing"),
      masteringSessions: typeCount("Mastering"),
      rehearsalSessions: typeCount("Rehearsal"),
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      averageDurationMinutes:
        sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0,
      sessionsByArtist,
    };
  });
}
