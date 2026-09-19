"use server";

import { createClient } from "@/lib/supabase/server";

export interface SessionConflict {
  id: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  session_type: string;
  artist_id: string | null;
  engineer_id: string | null;
  artist_name?: string;
  engineer_name?: string;
  project_title?: string;
  conflictTypes: ("time_overlap" | "artist_overlap" | "engineer_overlap")[];
}

export interface ConflictCheckParams {
  sessionDate: string;
  startTime: string;
  endTime: string;
  artistId?: string | null;
  engineerId?: string | null;
  excludeSessionId?: string | null;
}

export async function checkSessionConflicts(
  params: ConflictCheckParams
): Promise<{ hasConflict: boolean; conflicts: SessionConflict[] }> {
  const { sessionDate, startTime, endTime, artistId, engineerId, excludeSessionId } = params;

  if (!sessionDate || !startTime || !endTime) {
    return { hasConflict: false, conflicts: [] };
  }

  const supabase = await createClient();

  // Query all sessions for the target date
  let query = supabase
    .from("sessions")
    .select(`
      id, session_date, start_time, end_time, session_type, artist_id, engineer_id,
      artist:artists!artist_id(id, stage_name),
      engineer:artists!engineer_id(id, stage_name),
      project:projects!project_id(id, title)
    `)
    .eq("session_date", sessionDate);

  if (excludeSessionId) {
    query = query.neq("id", excludeSessionId);
  }

  const { data: existingSessions, error } = await query;

  if (error || !existingSessions || existingSessions.length === 0) {
    return { hasConflict: false, conflicts: [] };
  }

  // Helper to parse "HH:MM" to minutes from midnight
  const toMinutes = (timeStr?: string | null) => {
    if (!timeStr) return null;
    const parts = timeStr.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  const newStartMin = toMinutes(startTime);
  const newEndMin = toMinutes(endTime);

  if (newStartMin === null || newEndMin === null) {
    return { hasConflict: false, conflicts: [] };
  }

  const conflicts: SessionConflict[] = [];

  for (const session of existingSessions as any[]) {
    const existingStartMin = toMinutes(session.start_time);
    const existingEndMin = toMinutes(session.end_time);

    if (existingStartMin === null || existingEndMin === null) continue;

    // Check time interval overlap: (start1 < end2) AND (end1 > start2)
    const isOverlapping = existingStartMin < newEndMin && existingEndMin > newStartMin;

    if (isOverlapping) {
      const conflictTypes: ("time_overlap" | "artist_overlap" | "engineer_overlap")[] = [
        "time_overlap",
      ];

      if (artistId && session.artist_id === artistId) {
        conflictTypes.push("artist_overlap");
      }

      if (engineerId && session.engineer_id === engineerId) {
        conflictTypes.push("engineer_overlap");
      }

      conflicts.push({
        id: session.id,
        session_date: session.session_date,
        start_time: session.start_time,
        end_time: session.end_time,
        session_type: session.session_type,
        artist_id: session.artist_id,
        engineer_id: session.engineer_id,
        artist_name: session.artist?.stage_name,
        engineer_name: session.engineer?.stage_name,
        project_title: session.project?.title,
        conflictTypes,
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}
