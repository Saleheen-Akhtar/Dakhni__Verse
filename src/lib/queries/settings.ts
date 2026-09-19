"use server";

import { createClient } from "@/lib/supabase/server";
import { setTarget as baseSetTarget, getTarget } from "@/lib/calculations/targets";
import { getArtistOptions } from "./artists";

export async function getProducers() {
  const supabase = await createClient();
  
  // 1. First look for active artists whose role includes "Producer"
  const { data: producerArtists } = await supabase
    .from("artists")
    .select("id, stage_name")
    .eq("status", "Active")
    .ilike("dakhni_verse_role", "%Producer%")
    .order("stage_name", { ascending: true });

  if (producerArtists && producerArtists.length > 0) {
    return producerArtists.map((a: any) => ({
      id: a.id,
      name: a.stage_name,
    }));
  }

  // 2. Secondary look for users with Producer role linked to artists
  const { data: userProducers } = await supabase
    .from("users")
    .select("id, name, artist:artists!artist_id(id, stage_name)")
    .eq("role", "Producer");

  if (userProducers && userProducers.length > 0) {
    const mapped = userProducers
      .filter((u: any) => u.artist)
      .map((u: any) => ({
        id: u.artist.id,
        name: u.artist.stage_name || u.name,
      }));
    if (mapped.length > 0) return mapped;
  }

  // 3. Fallback: all active artists so target configuration remains functional
  const artists = await getArtistOptions();
  return (artists || []).map((a: any) => ({
    id: a.id,
    name: a.stage_name,
  }));
}

export async function getTargets() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("targets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function setTarget({
  user_id,
  metric,
  target_value,
  period = "monthly",
}: {
  user_id: string;
  metric: string;
  target_value: number;
  period?: string;
}) {
  return baseSetTarget(user_id, metric, target_value, period);
}
