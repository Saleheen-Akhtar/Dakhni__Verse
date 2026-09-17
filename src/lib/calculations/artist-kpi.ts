"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Per-artist KPI calculations.
 * Only shows metrics derived from real data.
 */

export interface ArtistKPIs {
  activeProjects: number;
  completedProjects: number;
  releasedSongs: number;
  sessionsAttended: number;
  studioHoursMinutes: number;
  studioHours: number;
  upcomingReleases: number;
  lastActivity: string | null;
}

export async function getArtistKPIs(artistId: string): Promise<ArtistKPIs> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Execute all 6 KPI queries concurrently in a single parallel batch
  const [
    { count: activeProjects },
    { count: completedProjects },
    { count: releasedSongs },
    { data: sessions },
    { count: upcomingReleases },
    { data: lastLog },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("artist_id", artistId)
      .not("status", "in", '("Released","Cancelled")'),
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("artist_id", artistId)
      .eq("status", "Released"),
    supabase
      .from("releases")
      .select("*", { count: "exact", head: true })
      .eq("artist_id", artistId)
      .eq("status", "Released"),
    supabase
      .from("sessions")
      .select("duration_minutes")
      .eq("artist_id", artistId),
    supabase
      .from("releases")
      .select("*", { count: "exact", head: true })
      .eq("artist_id", artistId)
      .in("status", ["Planned", "Scheduled"])
      .gte("release_date", today),
    supabase
      .from("activity_logs")
      .select("created_at")
      .eq("entity_id", artistId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const sessionsAttended = sessions?.length ?? 0;
  const studioHoursMinutes = (sessions || []).reduce(
    (sum, s) => sum + (s.duration_minutes || 0),
    0
  );

  const studioHours = Math.round((studioHoursMinutes / 60) * 10) / 10;

  return {
    activeProjects: activeProjects ?? 0,
    completedProjects: completedProjects ?? 0,
    releasedSongs: releasedSongs ?? 0,
    sessionsAttended,
    studioHoursMinutes,
    studioHours,
    upcomingReleases: upcomingReleases ?? 0,
    lastActivity: lastLog?.[0]?.created_at ?? null,
  };
}
