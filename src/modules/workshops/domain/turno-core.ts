import {
  err,
  ok,
  type FieldIssue,
  type Invalid,
  type Result,
} from "~/modules/_shared";

export type TurnoCoreField =
  "label" | "weekday" | "timeRange" | "defaultCapacity";
export type TurnoCoreDraft = {
  readonly label: string;
  readonly weekday: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly defaultCapacity: string;
};
type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const TURNO_LIMITS = {
  label: 40,
  capacity: { min: 1, max: 500 },
} as const;
export interface TurnoCore {
  readonly label: string;
  readonly labelKey: string;
  readonly weekday: Weekday;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly defaultCapacity: number;
}
export function turnoLabelKey(label: string): string {
  return label.normalize("NFC").toLocaleLowerCase("es");
}
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export function validateTurnoCore(
  draft: TurnoCoreDraft,
): Result<TurnoCore, Invalid<TurnoCoreField>> {
  const label = draft.label.trim().normalize("NFC");
  const issues: FieldIssue<TurnoCoreField>[] = [];
  if (!label) issues.push({ field: "label", code: "required" });
  else if (label.length > TURNO_LIMITS.label)
    issues.push({ field: "label", code: "too-long" });
  const weekday = Number(draft.weekday);
  if (!/^\d+$/.test(draft.weekday.trim()) || weekday < 1 || weekday > 7)
    issues.push({
      field: "weekday",
      code: /^\d+$/.test(draft.weekday.trim())
        ? "out-of-range"
        : "invalid-format",
    });
  if (!TIME.test(draft.startsAt) || !TIME.test(draft.endsAt))
    issues.push({ field: "timeRange", code: "invalid-format" });
  else if (draft.endsAt <= draft.startsAt)
    issues.push({ field: "timeRange", code: "end-before-start" });
  const capacity = Number(draft.defaultCapacity);
  if (!/^\d+$/.test(draft.defaultCapacity.trim()))
    issues.push({ field: "defaultCapacity", code: "invalid-format" });
  else if (
    capacity < TURNO_LIMITS.capacity.min ||
    capacity > TURNO_LIMITS.capacity.max
  )
    issues.push({ field: "defaultCapacity", code: "out-of-range" });
  return issues.length
    ? err({ kind: "invalid", issues })
    : ok({
        label,
        labelKey: turnoLabelKey(label),
        weekday: weekday as Weekday,
        startsAt: draft.startsAt,
        endsAt: draft.endsAt,
        defaultCapacity: capacity,
      });
}
export function compareTurnos(
  a: {
    readonly weekday: Weekday;
    readonly startsAt: string;
    readonly id: string;
  },
  b: {
    readonly weekday: Weekday;
    readonly startsAt: string;
    readonly id: string;
  },
): number {
  return (
    a.weekday - b.weekday ||
    (a.startsAt < b.startsAt
      ? -1
      : a.startsAt > b.startsAt
        ? 1
        : a.id < b.id
          ? -1
          : a.id > b.id
            ? 1
            : 0)
  );
}
