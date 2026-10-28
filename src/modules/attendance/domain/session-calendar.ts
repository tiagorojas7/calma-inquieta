/**
 * Class sessions are never stored: they are the dates of a turno's weekday
 * inside the period's month. Dates are `YYYY-MM-DD` calendar days, so no
 * time zone is involved; the studio's Córdoba day is the written date itself.
 */

/** ISO weekday of a `YYYY-MM-DD` date: Monday 1 to Sunday 7. */
export function weekdayOf(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/** Every date of `weekday` (1 to 7) inside `period` (`YYYY-MM`), ascending. */
export function sessionDates(period: string, weekday: number): string[] {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (!match) return [];
  const year = Number(match[1]);
  const month = Number(match[2]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${period}-${String(day).padStart(2, "0")}`;
    if (weekdayOf(date) === weekday) dates.push(date);
  }
  return dates;
}

export function isSessionDate(
  period: string,
  weekday: number,
  date: string,
): boolean {
  return sessionDates(period, weekday).includes(date);
}
