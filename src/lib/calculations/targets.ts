import { createClient } from "@/lib/supabase/server";
import type { Target, TargetProgress } from "@/types";
import { getTodayIST } from "@/lib/utils/dates";

/**
 * Target management and progress calculations.
 * Targets are configurable per-user, per-metric.
 */

export async function getTarget(
  userId: string,
  metric: string
): Promise<Target | null> {
  const supabase = await createClient();
  const today = getTodayIST();

  const { data, error } = await supabase
    .from("targets")
    .select("*")
    .eq("user_id", userId)
    .eq("metric", metric)
    .or(`effective_until.is.null,effective_until.gte.${today}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as Target;
}

export async function setTarget(
  userId: string,
  metric: string,
  targetValue: number,
  period: string = "monthly"
): Promise<Target> {
  const supabase = await createClient();

  // Upsert: update existing or create new
  const { data: existing } = await supabase
    .from("targets")
    .select("id")
    .eq("user_id", userId)
    .eq("metric", metric)
    .eq("period", period)
    .limit(1)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from("targets")
      .update({ target_value: targetValue, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating target:", error);
      throw new Error(error.message || "Failed to update target in database");
    }
    return data as Target;
  }

  const { data, error } = await supabase
    .from("targets")
    .insert({
      user_id: userId,
      metric,
      target_value: targetValue,
      period,
      effective_from: getTodayIST(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating target:", error);
    throw new Error(error.message || "Failed to create target in database");
  }
  return data as Target;
}

export { calculateProgress } from "./progress";
