/**
 * Date utilities for the Billkar QA suite.
 *
 * All functions return plain strings in YYYY-MM-DD format (ISO date part only)
 * unless noted otherwise. Use toISO() for full ISO-8601 strings.
 */

/** Returns today's date in YYYY-MM-DD format. */
export function today(): string {
  return formatDate(new Date());
}

/**
 * Returns a date N days in the past.
 * @param n - Number of days ago (positive integer).
 */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatDate(d);
}

/**
 * Returns a date N days in the future.
 * @param n - Number of days ahead (positive integer).
 */
export function daysAhead(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

/**
 * Formats a Date object to YYYY-MM-DD.
 * @param date - The Date object to format.
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Returns the first day of the current month in YYYY-MM-DD format. */
export function startOfMonth(): string {
  const d = new Date();
  return formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** Returns the last day of the current month in YYYY-MM-DD format. */
export function endOfMonth(): string {
  const d = new Date();
  return formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/**
 * Returns a full ISO-8601 string (with time) for the given date.
 * Defaults to now() if no date is passed.
 */
export function toISO(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Parses a YYYY-MM-DD string into a Date object at midnight UTC.
 * @param str - Date string in YYYY-MM-DD format.
 */
export function parseDate(str: string): Date {
  return new Date(`${str}T00:00:00.000Z`);
}

/**
 * Returns the first and last day of the current month as an object.
 * Useful for seeding date-range filter tests.
 */
export function currentMonthRange(): { from: string; to: string } {
  return { from: startOfMonth(), to: endOfMonth() };
}
