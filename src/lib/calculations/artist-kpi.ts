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

  // Execute consolidated KPI queries concurrently
  const [
    { data: projects },
    { data: releases },
    { data: sessions },
    { data: lastLog },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("status")
      .eq("artist_id", artistId)
      .not("status", "eq", "Cancelled"),
    supabase
      .from("releases")
      .select("status, release_date")
      .eq("artist_id", artistId),
    supabase
      .from("sessions")
      .select("duration_minutes")
      .eq("artist_id", artistId),
    supabase
      .from("activity_logs")
      .select("created_at")
      .eq("entity_id", artistId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const allProjects = projects || [];
  const activeProjects = allProjects.filter((p) => p.status !== "Released").length;
  const completedProjects = allProjects.filter((p) => p.status === "Released").length;

  const allReleases = releases || [];
  const releasedSongs = allReleases.filter((r) => r.status === "Released").length;
  const upcomingReleases = allReleases.filter(
    (r) =>
      (r.status === "Planned" || r.status === "Scheduled") &&
      r.release_date &&
      r.release_date >= today
  ).length;

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
