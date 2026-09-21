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
): Promise<Target | null> {
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
      .update({ target_value: targetValue })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating target:", error);
      return null;
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
      effective_from: new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating target:", error);
    return null;
  }
  return data as Target;
}

/**
 * Calculate progress toward a target.
 * Returns null percentage if no target is configured.
 */
export function calculateProgress(
  actual: number,
  target: number | null
): TargetProgress {
  if (target === null || target === undefined) {
    return {
      actual,
      target: null,
      percentage: null,
      hasTarget: false,
    };
  }

  if (target === 0) {
    return {
      actual,
      target: 0,
      percentage: null,
      hasTarget: true,
    };
  }

  return {
    actual,
    target,
    percentage: Math.round((actual / target) * 100),
    hasTarget: true,
  };
}
