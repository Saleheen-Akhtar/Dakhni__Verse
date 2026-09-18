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

  let query = supabase
    .from("projects")
    .select("status, producer_id, mix_engineer_id, mastering_engineer_id")
    .not("status", "eq", "Cancelled");

  if (producerArtistId) {
    query = query.or(
      `producer_id.eq.${producerArtistId},mix_engineer_id.eq.${producerArtistId},mastering_engineer_id.eq.${producerArtistId}`
    );
  }

  const { data: allProjects } = await query;
  const projects = allProjects || [];

  const producerProjects = producerArtistId
    ? projects.filter((p) => p.producer_id === producerArtistId)
    : projects.filter((p) => p.producer_id !== null);

  const mixProjects = producerArtistId
    ? projects.filter((p) => p.mix_engineer_id === producerArtistId)
    : projects.filter((p) => p.mix_engineer_id !== null);

  const masterProjects = producerArtistId
    ? projects.filter((p) => p.mastering_engineer_id === producerArtistId)
    : projects.filter((p) => p.mastering_engineer_id !== null);

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
