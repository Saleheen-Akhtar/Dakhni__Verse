"use server";

import { createClient } from "@/lib/supabase/server";
import { setTarget as baseSetTarget, getTarget } from "@/lib/calculations/targets";
import { getArtistOptions } from "./artists";

export async function getProducers() {
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
