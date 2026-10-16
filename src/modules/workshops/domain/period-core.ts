import {
  err,
  ok,
  type Result,
  type TransitionRefused,
} from "~/modules/_shared";

export type PeriodKey = `${number}-${string}`;
export type PeriodLifecycle = "draft" | "open" | "closed";

export function parsePeriodKey(
  value: string,
): Result<PeriodKey, "invalid-format"> {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
    ? ok(value as PeriodKey)
    : err("invalid-format");
}

export function addMonths(period: PeriodKey, count: number): PeriodKey {
  const [year, month] = period.split("-").map(Number);
  const total = (year ?? 0) * 12 + (month ?? 1) - 1 + count;
  const nextYear = String(Math.floor(total / 12));
  return `${nextYear}-${String((total % 12) + 1).padStart(2, "0")}` as PeriodKey;
}

export function periodInRange(period: PeriodKey, current: PeriodKey): boolean {
  return period >= current && period <= addMonths(current, 12);
}

/** Argentina/Córdoba has UTC-3 and no DST; construct its midnight as an instant. */
export function firstInstantOfNextCordobaMonth(period: PeriodKey): Date {
  const next = addMonths(period, 1);
  const [year, month] = next.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, 1, 3));
}

export function cordobaMonthOf(instant: Date): PeriodKey {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
    month: "2-digit",
  }).format(instant) as PeriodKey;
}

export function effectivePeriodStatus(
  stored: PeriodLifecycle,
  period: PeriodKey,
  now: Date,
): PeriodLifecycle {
  return cordobaMonthOf(now) > period ? "closed" : stored;
}

const transitions: Readonly<
  Record<PeriodLifecycle, readonly PeriodLifecycle[]>
> = {
  draft: ["open"],
  open: ["closed"],
  closed: [],
};

export function transitionPeriod(
  from: PeriodLifecycle,
  to: PeriodLifecycle,
): Result<PeriodLifecycle, TransitionRefused<PeriodLifecycle>> {
  return transitions[from].includes(to)
    ? ok(to)
    : err({ kind: "transition-refused", from, to });
}
