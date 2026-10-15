/**
 * Córdoba calendar dates. Argentina has had no daylight saving time since
 * 2009, so the zone is a fixed UTC-03:00 (design DA6); a guard test fails if
 * the runtime time-zone data ever disagrees.
 */
export const CORDOBA_UTC_OFFSET = "-03:00";

const DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Cordoba",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `YYYY-MM-DD`, the calendar date in Córdoba at `instant`. */
export function cordobaDateOf(instant: Date): string {
  return DATE_FORMAT.format(instant);
}
