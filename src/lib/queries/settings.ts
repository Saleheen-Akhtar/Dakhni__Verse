"use server";

import { createClient } from "@/lib/supabase/server";
import { setTarget as baseSetTarget, getTarget } from "@/lib/calculations/targets";
import { getArtistOptions } from "./artists";

export async function getProducers() {
  const supabase = await createClient();

  // Query users with Producer or Manager role, or linked to active artists
  const { data: users, error } = await supabase
    .from("users")
    .select("id, name, email, role, artist_id, artist:artists!artist_id(id, stage_name, dakhni_verse_role, status)")
    .order("name", { ascending: true });

  if (error || !users) {
    console.error("Error fetching producers from users:", error);
    return [];
  }

  // Include users who are Producers, Managers, or have an artist role of Producer
  const eligibleUsers = users.filter((u: any) => {
    if (u.role === "Producer" || u.role === "Manager") return true;
    const artistRole = u.artist?.dakhni_verse_role || "";
    return artistRole.toLowerCase().includes("producer");
  });

  return eligibleUsers.map((u: any) => ({
    id: u.id, // users.id is required by targets.user_id FK!
    name: u.artist?.stage_name || u.name,
    role: u.role,
    artist_id: u.artist_id,
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
