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

  // Calculate previous date and next date to handle overnight sessions across midnight
  const targetDate = new Date(`${sessionDate}T00:00:00`);
  const prevDateObj = new Date(targetDate);
  prevDateObj.setDate(prevDateObj.getDate() - 1);
  const prevDate = prevDateObj.toISOString().split("T")[0];

  const nextDateObj = new Date(targetDate);
  nextDateObj.setDate(nextDateObj.getDate() + 1);
  const nextDate = nextDateObj.toISOString().split("T")[0];

  const relevantDates = [prevDate, sessionDate, nextDate];

  // Query candidate sessions across date boundaries
  let query = supabase
    .from("sessions")
    .select(`
      id, session_date, start_time, end_time, session_type, artist_id, engineer_id, notes, status,
      artist:artists!artist_id(id, stage_name),
      engineer:artists!engineer_id(id, stage_name),
      project:projects!project_id(id, title)
    `)
    .in("session_date", relevantDates);

  if (excludeSessionId) {
    query = query.neq("id", excludeSessionId);
  }

  const { data: existingSessions, error } = await query;

  if (error || !existingSessions || existingSessions.length === 0) {
    return { hasConflict: false, conflicts: [] };
  }

  // Calculate requested session timestamps (supports overnight)
  const reqStart = new Date(`${sessionDate}T${startTime.substring(0, 5)}:00`).getTime();
  let reqEnd = new Date(`${sessionDate}T${endTime.substring(0, 5)}:00`).getTime();
  if (reqEnd <= reqStart) {
    reqEnd += 24 * 60 * 60 * 1000; // Crosses midnight into next day
  }

  const conflicts: SessionConflict[] = [];

  for (const session of existingSessions as any[]) {
    // Skip cancelled sessions
    if (session.status === "Cancelled" || session.notes?.includes("[CANCELLED]")) continue;
    if (!session.start_time || !session.end_time || !session.session_date) continue;

    const existStart = new Date(
      `${session.session_date}T${session.start_time.substring(0, 5)}:00`
    ).getTime();
    let existEnd = new Date(
      `${session.session_date}T${session.end_time.substring(0, 5)}:00`
    ).getTime();
    if (existEnd <= existStart) {
      existEnd += 24 * 60 * 60 * 1000; // Crosses midnight into next day
    }

    // Mathematical interval overlap: (start1 < end2) AND (end1 > start2)
    const isOverlapping = existStart < reqEnd && existEnd > reqStart;

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
