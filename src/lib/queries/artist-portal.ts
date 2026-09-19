"use server";

import { createClient } from "@/lib/supabase/server";
import { CurrentUser } from "@/types";

export interface ArtistSummary {
  id: string;
  stage_name: string;
  legal_name: string | null;
  profile_image_url: string | null;
  dakhni_verse_role: string | null;
}

export interface UpcomingSession {
  id: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  session_type: string;
  notes: string | null;
  project?: { id: string; title: string } | null;
  engineer?: { id: string; stage_name: string } | null;
}

export interface ArtistProjectItem {
  id: string;
  title: string;
  status: string;
  target_release_date: string | null;
  created_at: string;
  producer?: { id: string; stage_name: string } | null;
}

export interface ArtistReleaseItem {
  id: string;
  title: string;
  release_type: string;
  release_date: string | null;
  status: string;
  streaming_links: any;
}

/**
 * Resolves the connected artist record for a logged in user.
 */
export async function resolveArtistForUser(profile: CurrentUser): Promise<ArtistSummary | null> {
  const supabase = await createClient();

  // 1. Check direct artist_id link
  if (profile.artist_id) {
    const { data } = await supabase
      .from("artists")
      .select("id, stage_name, legal_name, profile_image_url, dakhni_verse_role")
      .eq("id", profile.artist_id)
      .single();

    if (data) return data;
  }

  // 2. Fallback: match by user email
  if (profile.email) {
    const { data } = await supabase
      .from("artists")
      .select("id, stage_name, legal_name, profile_image_url, dakhni_verse_role")
      .ilike("email", profile.email.trim())
      .limit(1)
      .maybeSingle();

    if (data) return data;
  }

  // 3. Fallback: match by name
  if (profile.name) {
    const { data } = await supabase
      .from("artists")
      .select("id, stage_name, legal_name, profile_image_url, dakhni_verse_role")
      .ilike("stage_name", profile.name.trim())
      .limit(1)
      .maybeSingle();

    if (data) return data;
  }

  return null;
}

/**
 * Fetches upcoming booked studio sessions for an artist.
 */
export async function getArtistUpcomingSessions(artistId: string): Promise<UpcomingSession[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("sessions")
    .select(`
      id, session_date, start_time, end_time, session_type, notes,
      project:projects!project_id(id, title),
      engineer:artists!engineer_id(id, stage_name)
    `)
    .eq("artist_id", artistId)
    .gte("session_date", today)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(5);

  if (error) {
    console.error("Error fetching upcoming sessions for artist:", error);
    return [];
  }

  return (data || []) as unknown as UpcomingSession[];
}

/**
 * Fetches active projects for an artist.
 */
export async function getArtistPersonalProjects(artistId: string, limit = 6): Promise<ArtistProjectItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select(`
      id, title, status, target_release_date, created_at,
      producer:artists!producer_id(id, stage_name)
    `)
    .eq("artist_id", artistId)
    .not("status", "eq", "Cancelled")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching artist personal projects:", error);
    return [];
  }

  return (data || []) as unknown as ArtistProjectItem[];
}

/**
 * Fetches releases for an artist.
 */
export async function getArtistPersonalReleases(artistId: string, limit = 4): Promise<ArtistReleaseItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("releases")
    .select("id, title, release_type, release_date, status, streaming_links")
    .eq("artist_id", artistId)
    .order("release_date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching artist releases:", error);
    return [];
  }

  return (data || []) as unknown as ArtistReleaseItem[];
}
