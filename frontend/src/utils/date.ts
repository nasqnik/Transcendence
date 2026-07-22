/**
 * Local-timezone date helpers. Use these instead of `toISOString().slice(0, 10)`
 * (which yields the UTC date) so "today" reflects the user's calendar day — a
 * task done at 8 pm UTC-5 should count as today for that kid, not tomorrow.
 */

/** Format a Date as YYYY-MM-DD in the browser's local timezone. */
export function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Today's local date as a YYYY-MM-DD string. */
export function todayStr(): string {
  return localDateStr(new Date())
}

/** Today plus `days` (may be negative) as a local YYYY-MM-DD string. */
export function dateStrFromToday(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return localDateStr(d)
}
