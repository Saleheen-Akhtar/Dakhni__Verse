"use server";

import { createClient } from "@/lib/supabase/server";
import { measureQuery } from "@/lib/telemetry/perf";

/**
 * Activity Logger
 * Records real actions performed by users for the activity feed.
 * Supports visibility categorization ('collective' vs 'admin') enforced by DB RLS.
 */
export async function logActivity(
  userId: string | null | undefined,
  action: string,
  entityType: string,
  entityId: string | null,
  description: string,
  visibility: "collective" | "admin" = "collective"
): Promise<void> {
  try {
    const supabase = await createClient();
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      resolvedUserId = user?.id || null;
    }

    await supabase.from("activity_logs").insert({
      user_id: resolvedUserId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      description,
      visibility,
    });
  } catch (err) {
    // Non-blocking logger error logging
    console.error("Failed to log activity:", err);
  }
}

export async function getRecentActivity(limit: number = 20) {
  return measureQuery("getRecentActivity", async () => {
    const supabase = await createClient();

    // RLS in migration 021 automatically filters: non-managers only receive visibility = 'collective'
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*, user:users!user_id(name)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching activity:", error);
      return [];
    }

    return data || [];
  });
}
