/**
 * Date utilities for Dakhni Verse, centered on India Standard Time (IST, UTC+05:30).
 */

/**
 * Returns the current date formatted as YYYY-MM-DD in Asia/Kolkata timezone.
 * Avoids the 00:00 to 05:30 IST off-by-one UTC discrepancy.
 */
export function getTodayIST(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Calculates a date relative to a base YYYY-MM-DD string by deltaDays,
 * operating in pure UTC date arithmetic to avoid any local client/server timezone distortion.
 */
export function shiftDateString(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().split('T')[0];
}
