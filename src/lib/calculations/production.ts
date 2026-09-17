"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProductionWorkload } from "@/types";

/**
 * Production KPI calculations for The Bear (or any producer).
 * Tracks production, mixing, and mastering workload separately.
 */

export async function getProductionWorkload(
  producerArtistId?: string | null
): Promise<ProductionWorkload> {
  const supabase = await createClient();

  let producerQuery = supabase
    .from("projects")
    .select("status")
    .not("status", "eq", "Cancelled");

  let mixQuery = supabase
    .from("projects")
    .select("status")
    .not("status", "eq", "Cancelled");

  let masterQuery = supabase
    .from("projects")
    .select("status")
    .not("status", "eq", "Cancelled");

  if (producerArtistId) {
    producerQuery = producerQuery.eq("producer_id", producerArtistId);
    mixQuery = mixQuery.eq("mix_engineer_id", producerArtistId);
    masterQuery = masterQuery.eq("mastering_engineer_id", producerArtistId);
  } else {
    // Collective studio-wide workload for assigned projects
    producerQuery = producerQuery.not("producer_id", "is", null);
    mixQuery = mixQuery.not("mix_engineer_id", "is", null);
    masterQuery = masterQuery.not("mastering_engineer_id", "is", null);
  }

  // Parallel execution across all 3 disciplines
  const [
    { data: producerProjects },
    { data: mixProjects },
    { data: masterProjects },
  ] = await Promise.all([
    producerQuery,
    mixQuery,
    masterQuery,
  ]);

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
