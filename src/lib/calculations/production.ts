"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProductionWorkload } from "@/types";

/**
 * Production KPI calculations for The Bear (or any producer).
 * Tracks production, mixing, and mastering workload separately.
 */

export async function getProductionWorkload(
  producerArtistId: string
): Promise<ProductionWorkload> {
  const supabase = await createClient();

  // Production: projects where this person is the producer
  const { data: producerProjects } = await supabase
    .from("projects")
    .select("status")
    .eq("producer_id", producerArtistId)
    .not("status", "eq", "Cancelled");

  // Mixing: projects where this person is the mix engineer
  const { data: mixProjects } = await supabase
    .from("projects")
    .select("status")
    .eq("mix_engineer_id", producerArtistId)
    .not("status", "eq", "Cancelled");

  // Mastering: projects where this person is the mastering engineer
  const { data: masterProjects } = await supabase
    .from("projects")
    .select("status")
    .eq("mastering_engineer_id", producerArtistId)
    .not("status", "eq", "Cancelled");

  const productionStatuses = ["Idea", "Writing", "Production", "Recording", "Editing"];
  const mixingInProgress = ["Mixing"];
  const masteringInProgress = ["Mastering"];
  const completedStatuses = ["Ready", "Released"];

  function countByCategory(projects: Array<{ status: string }> | null) {
    const items = projects || [];
    return {
      assigned: items.length,
      inProgress: 0,
      completed: items.filter((p) => completedStatuses.includes(p.status)).length,
    };
  }

  const production = countByCategory(producerProjects);
  production.inProgress = (producerProjects || []).filter((p) =>
    productionStatuses.includes(p.status)
  ).length;

  const mixing = countByCategory(mixProjects);
  mixing.inProgress = (mixProjects || []).filter((p) =>
    mixingInProgress.includes(p.status)
  ).length;

  const mastering = countByCategory(masterProjects);
  mastering.inProgress = (masterProjects || []).filter((p) =>
    masteringInProgress.includes(p.status)
  ).length;

  return { production, mixing, mastering };
}
