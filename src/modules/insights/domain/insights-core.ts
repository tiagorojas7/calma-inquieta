import { Money } from "~/modules/_shared";

const PERIOD_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Argentina has no DST: Cordoba midnight is 03:00 UTC all year. */
const CORDOBA_MIDNIGHT_UTC_HOUR = 3;

/** Pending requests older than this are an alert (design: 48 h). */
export const PENDING_ALERT_HOURS = 48;

/** A period is a calendar month as `YYYY-MM`. */
export function isPeriod(value: string): boolean {
  return PERIOD_KEY.test(value);
}

/** The month after a valid period, rolling over the year. */
export function nextPeriod(period: string): string {
  const match = PERIOD_KEY.exec(period);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  return month === 12
    ? `${String(year + 1)}-01`
    : `${String(year)}-${String(month + 1).padStart(2, "0")}`;
}

/** The UTC instants where a Cordoba month starts (inclusive) and ends (exclusive). */
export function periodBounds(period: string): { from: Date; to: Date } {
  const instant = (key: string) =>
    new Date(`${key}-01T0${String(CORDOBA_MIDNIGHT_UTC_HOUR)}:00:00.000Z`);
  return { from: instant(period), to: instant(nextPeriod(period)) };
}

/** A whole percent, 0 when there is no whole to measure against. */
export function percentOf(part: number, whole: number): number {
  return whole <= 0 ? 0 : Math.round((part / whole) * 100);
}

/** Sums of whole centavos stay safe integers; anything else is a defect. */
export function pesos(centavos: number): Money {
  const money = Money.fromCentavos(centavos);
  if (!money.ok) throw new Error("aggregated amount is not a safe integer");
  return money.value;
}

const BASIS_POINTS = 10_000;

/**
 * A teacher's share of a fee income: whole centavos, half a centavo rounded
 * up. Integer arithmetic only, so no floating point drift.
 */
export function settlementCentavos(
  feeCentavos: number,
  percentageBp: number,
): number {
  return Math.floor(
    (feeCentavos * percentageBp + BASIS_POINTS / 2) / BASIS_POINTS,
  );
}
