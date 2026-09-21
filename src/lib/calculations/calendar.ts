export interface SessionIntervalInput {
  id?: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  status?: string;
  notes?: string | null;
}

/**
 * Calculates the exact epoch timestamps for a studio session,
 * correctly handling overnight sessions where end_time <= start_time
 * (which cross midnight into the next day).
 * Excludes cancelled sessions.
 */
export function getSessionInterval(session: SessionIntervalInput): { startMs: number; endMs: number } | null {
  if (!session.session_date || !session.start_time || !session.end_time) return null;
  const isCancelled = session.status === "Cancelled" || session.notes?.includes("[CANCELLED]");
  if (isCancelled) return null;

  const dateStr = session.session_date.split("T")[0];
  const [sH, sM] = session.start_time.split(":").map(Number);
  const [eH, eM] = session.end_time.split(":").map(Number);

  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return null;

  const [year, month, day] = dateStr.split("-").map(Number);
  const startDate = new Date(year, month - 1, day, sH, sM, 0, 0);
  let endDate = new Date(year, month - 1, day, eH, eM, 0, 0);

  // If end time is earlier or equal to start time, the session spans past midnight into next day
  if (endDate.getTime() <= startDate.getTime()) {
    endDate = new Date(year, month - 1, day + 1, eH, eM, 0, 0);
  }

  return { startMs: startDate.getTime(), endMs: endDate.getTime() };
}

/**
 * Determines whether two studio sessions have an active time collision.
 * Correctly accounts for overnight spans across midnight and ignores cancelled sessions.
 */
export function doSessionsOverlap(s1: SessionIntervalInput, s2: SessionIntervalInput): boolean {
  const i1 = getSessionInterval(s1);
  const i2 = getSessionInterval(s2);
  if (!i1 || !i2) return false;
  return i1.startMs < i2.endMs && i1.endMs > i2.startMs;
}
