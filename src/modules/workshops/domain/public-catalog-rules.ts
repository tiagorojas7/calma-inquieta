import { SLUG_FORMAT } from "./intensive-core";

/**
 * Pure rules of the public catalog. They take strings and numbers, never
 * `Date`, so no time-zone bug can hide in them.
 */

/** A slug the catalog could ever have stored; junk is refused before any query (PC8). */
export function isPublicSlug(slug: string, maxLength: number): boolean {
  return slug.length <= maxLength && SLUG_FORMAT.test(slug);
}

/** An intensivo stays visible for its whole Córdoba date (DA5); ISO strings sort by date. */
export function isUpcoming(eventDate: string, today: string): boolean {
  return eventDate >= today;
}

export interface IntensivoOrderKey {
  readonly eventDate: string;
  readonly startsAt: string;
  readonly name: string;
  readonly slug: string;
}

const NAME_COLLATOR = new Intl.Collator("es", { sensitivity: "base" });

/** Date, then start time, then name (Spanish-aware), then slug: a total order (DA7). */
export function compareIntensivos(
  a: IntensivoOrderKey,
  b: IntensivoOrderKey,
): number {
  if (a.eventDate !== b.eventDate) return a.eventDate < b.eventDate ? -1 : 1;
  if (a.startsAt !== b.startsAt) return a.startsAt < b.startsAt ? -1 : 1;
  const byName = NAME_COLLATOR.compare(a.name, b.name);
  if (byName !== 0) return byName;
  if (a.slug === b.slug) return 0;
  return a.slug < b.slug ? -1 : 1;
}

/**
 * The monthly offering: the current Córdoba month when open, else the earliest
 * later open month, else none. Past months are never selected; `YYYY-MM` keys
 * sort chronologically as strings.
 */
export function selectOffering<T extends { readonly period: string }>(
  openPeriods: readonly T[],
  currentPeriod: string,
): T | null {
  let best: T | null = null;
  for (const candidate of openPeriods) {
    if (candidate.period < currentPeriod) continue;
    if (best === null || candidate.period < best.period) best = candidate;
  }
  return best;
}

export interface TurnoOrderKey {
  readonly weekday: number;
  readonly startsAt: string;
}

/** Weekday (Monday 1 to Sunday 7), then start time. */
export function compareTurnos(a: TurnoOrderKey, b: TurnoOrderKey): number {
  if (a.weekday !== b.weekday) return a.weekday - b.weekday;
  if (a.startsAt === b.startsAt) return 0;
  return a.startsAt < b.startsAt ? -1 : 1;
}

export interface TallerOrderKey {
  readonly name: string;
  readonly slug: string;
}

/** Name (Spanish-aware), then slug: a total order. */
export function compareTalleres(a: TallerOrderKey, b: TallerOrderKey): number {
  const byName = NAME_COLLATOR.compare(a.name, b.name);
  if (byName !== 0) return byName;
  if (a.slug === b.slug) return 0;
  return a.slug < b.slug ? -1 : 1;
}
