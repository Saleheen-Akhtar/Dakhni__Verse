"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Activity Logger
 * Records real actions performed by users for the activity feed.
 */

export async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  description: string
): Promise<void> {
  const supabase = await createClient();

  await supabase.from("activity_logs").insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    description,
  });
}

import { measureQuery } from "@/lib/telemetry/perf";

export async function getRecentActivity(limit: number = 20) {
  return measureQuery("getRecentActivity", async () => {
    const supabase = await createClient();

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
