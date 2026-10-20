import { err, ok, type Result } from "~/modules/_shared";

export type PeriodStatus = "draft" | "open" | "closed";
export type PeriodClosed = { readonly kind: "period-closed" };

const CORDOBA_OFFSET_MS = 3 * 60 * 60 * 1000;

/** `YYYY-MM` of the Córdoba calendar month at `instant` (fixed UTC-03:00). */
export function cordobaMonthOf(instant: Date): string {
  const shifted = new Date(instant.getTime() - CORDOBA_OFFSET_MS);
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${String(shifted.getUTCFullYear())}-${month}`;
}

/**
 * Orders may be requested and confirmed only for an `open` period whose month
 * is the current Córdoba month or later. `YYYY-MM` keys compare lexically.
 */
export function periodAcceptsOrders(
  period: { readonly status: PeriodStatus; readonly period: string },
  now: Date,
): Result<string, PeriodClosed> {
  return period.status === "open" && period.period >= cordobaMonthOf(now)
    ? ok(period.period)
    : err({ kind: "period-closed" });
}
